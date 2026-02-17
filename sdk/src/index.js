const { ethers } = require("ethers");
const { PRMISSION_V2_ABI, ERC20_ABI } = require("./abi");
const { NETWORKS, PROTOCOL, DEFAULT_NETWORK } = require("./constants");

class PrmissionClient {
  constructor(options = {}) {
    const network = NETWORKS[options.network || DEFAULT_NETWORK];
    if (!network) throw new Error("Unknown network: " + options.network);
    this.network = network;
    this.rpcUrl = options.rpcUrl || network.rpcUrl;
    if (options.signer) {
      this.signer = options.signer;
      this.provider = options.signer.provider || new ethers.JsonRpcProvider(this.rpcUrl);
    } else if (options.provider) {
      this.provider = options.provider;
      this.signer = null;
    } else {
      this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
      this.signer = null;
    }
    const contractAddress = options.contractAddress || network.contracts.prmissionV2;
    const usdcAddress = network.contracts.usdc;
    if (!contractAddress) throw new Error("No PrmissionV2 contract address for network: " + network.name);
    const signerOrProvider = this.signer || this.provider;
    this.contract = new ethers.Contract(contractAddress, PRMISSION_V2_ABI, signerOrProvider);
    this.usdc = usdcAddress ? new ethers.Contract(usdcAddress, ERC20_ABI, signerOrProvider) : null;
    this.contractAddress = contractAddress;
    this.usdcAddress = usdcAddress;
  }

  _requireSigner() {
    if (!this.signer) throw new Error("Signer required for write operations.");
  }

  parseUSDC(amount) { return ethers.parseUnits(String(amount), PROTOCOL.USDC_DECIMALS); }
  formatUSDC(amount) { return ethers.formatUnits(amount, PROTOCOL.USDC_DECIMALS); }

  async getAddress() { this._requireSigner(); return this.signer.getAddress(); }

  async getUSDCBalance(address) {
    if (!this.usdc) throw new Error("USDC not available on this network");
    const addr = address || (await this.getAddress());
    return this.formatUSDC(await this.usdc.balanceOf(addr));
  }

  async approveUSDC(amount) {
    this._requireSigner();
    const tx = await this.usdc.approve(this.contractAddress, this.parseUSDC(amount));
    return tx.wait();
  }

  async getUSDCAllowance(owner) {
    const addr = owner || (await this.getAddress());
    return this.formatUSDC(await this.usdc.allowance(addr, this.contractAddress));
  }

  async grantPermission({ agent, dataType, compensationPercent, durationSeconds, upfrontFee = 0 }) {
    this._requireSigner();
    if (compensationPercent < 0 || compensationPercent > 50) throw new Error("Compensation must be 0-50%");
    const tx = await this.contract.grantPermission(agent, dataType, Math.round(compensationPercent * 100), durationSeconds, this.parseUSDC(upfrontFee));
    const receipt = await tx.wait();
    const event = receipt.logs.map((log) => { try { return this.contract.interface.parseLog(log); } catch { return null; } }).find((e) => e && e.name === "PermissionGranted");
    return { tx: receipt, permissionId: event ? event.args.permissionId : null };
  }

  async revokePermission(permissionId) {
    this._requireSigner();
    const tx = await this.contract.revokePermission(permissionId);
    return tx.wait();
  }

  async getUserPermissions(userAddress, offset = 0, limit = 100) {
    return this.contract.getUserPermissions(userAddress, offset, limit);
  }

  async depositEscrow({ permissionId, amount, autoApprove = true }) {
    this._requireSigner();
    const amountWei = this.parseUSDC(amount);
    if (autoApprove && this.usdc) {
      const ownerAddr = await this.getAddress();
      const currentAllowance = await this.usdc.allowance(ownerAddr, this.contractAddress);
      if (currentAllowance < amountWei) {
        const approveTx = await this.usdc.approve(this.contractAddress, amountWei);
        await approveTx.wait();
      }
    }
    const tx = await this.contract.depositEscrow(permissionId, amountWei);
    const receipt = await tx.wait();
    const event = receipt.logs.map((log) => { try { return this.contract.interface.parseLog(log); } catch { return null; } }).find((e) => e && e.name === "EscrowDeposited");
    return { tx: receipt, escrowId: event ? event.args.escrowId : null };
  }

  async reportOutcome(escrowId, outcomeValue) {
    this._requireSigner();
    const tx = await this.contract.reportOutcome(escrowId, this.parseUSDC(outcomeValue));
    return tx.wait();
  }

  async refundEscrow(escrowId) {
    this._requireSigner();
    const tx = await this.contract.refundEscrow(escrowId);
    return tx.wait();
  }

  async settle(escrowId) {
    this._requireSigner();
    const tx = await this.contract.settle(escrowId);
    const receipt = await tx.wait();
    const event = receipt.logs.map((log) => { try { return this.contract.interface.parseLog(log); } catch { return null; } }).find((e) => e && e.name === "Settled");
    return {
      tx: receipt,
      userPayout: event ? this.formatUSDC(event.args.userPayout) : null,
      protocolFee: event ? this.formatUSDC(event.args.protocolFee) : null,
      agentPayout: event ? this.formatUSDC(event.args.agentPayout) : null
    };
  }

  async disputeSettlement(escrowId, reason) {
    this._requireSigner();
    const tx = await this.contract.disputeSettlement(escrowId, reason);
    return tx.wait();
  }

  async getPermission(permissionId) {
    const p = await this.contract.getPermission(permissionId);
    return { user: p.user, agent: p.agent, dataType: p.dataType, compensationPercent: Number(p.compensationBps) / 100, expiresAt: new Date(Number(p.expiresAt) * 1000), upfrontFee: this.formatUSDC(p.upfrontFee), active: p.active, revokedAt: Number(p.revokedAt) > 0 ? new Date(Number(p.revokedAt) * 1000) : null };
  }

  async getEscrow(escrowId) {
    const e = await this.contract.getEscrow(escrowId);
    return { permissionId: e.permissionId, agent: e.agent, amount: this.formatUSDC(e.amount), outcomeValue: this.formatUSDC(e.outcomeValue), outcomeReported: e.outcomeReported, outcomeReportedAt: Number(e.outcomeReportedAt) > 0 ? new Date(Number(e.outcomeReportedAt) * 1000) : null, settled: e.settled, disputed: e.disputed, disputeReason: e.disputeReason };
  }

  async getPermissionEscrows(permissionId) { return this.contract.getPermissionEscrows(permissionId); }
  async isPaused() { return this.contract.paused(); }
  async getOwner() { return this.contract.owner(); }
  async getTreasury() { return this.contract.treasury(); }

  async isSettleable(escrowId) {
    const escrow = await this.contract.getEscrow(escrowId);
    if (!escrow.outcomeReported || escrow.settled || escrow.disputed) return { ready: false, timeRemaining: null };
    const now = Math.floor(Date.now() / 1000);
    const settleTime = Number(escrow.outcomeReportedAt) + PROTOCOL.DISPUTE_WINDOW;
    const timeRemaining = Math.max(0, settleTime - now);
    return { ready: timeRemaining === 0, timeRemaining };
  }

  onPermissionGranted(agentAddress, callback) {
    const filter = this.contract.filters.PermissionGranted(null, null, agentAddress);
    const handler = (permissionId, user, agent, dataType, compensationBps) => { callback({ permissionId, user, agent, dataType, compensationPercent: Number(compensationBps) / 100 }); };
    this.contract.on(filter, handler);
    return () => this.contract.off(filter, handler);
  }

  onEscrowDeposited(permissionId, callback) {
    const filter = this.contract.filters.EscrowDeposited(null, permissionId);
    const handler = (escrowId, permId, agent, amount) => { callback({ escrowId, permissionId: permId, agent, amount: this.formatUSDC(amount) }); };
    this.contract.on(filter, handler);
    return () => this.contract.off(filter, handler);
  }

  onSettled(callback) {
    const handler = (escrowId, userPayout, protocolFee, agentPayout) => { callback({ escrowId, userPayout: this.formatUSDC(userPayout), protocolFee: this.formatUSDC(protocolFee), agentPayout: this.formatUSDC(agentPayout) }); };
    this.contract.on("Settled", handler);
    return () => this.contract.off("Settled", handler);
  }
}

module.exports = { PrmissionClient };
