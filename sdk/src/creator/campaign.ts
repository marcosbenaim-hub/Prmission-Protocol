import { ethers } from "ethers";

const EXTENSION_ABI = [
  "function createCampaign(address creator, string category, string contentType, uint256 escrowAmount, uint256 creatorBps, uint256 managerBps, address manager) external returns (uint256 campaignId)",
  "function reportOutcome(uint256 campaignId, uint256 outcomeValue, string metadata) external",
  "function settle(uint256 campaignId) external",
  "function dispute(uint256 campaignId) external",
  "function previewSettlement(uint256 campaignId) external view returns (uint256 creatorShare, uint256 managerShare, uint256 referralShare, uint256 protocolFee, uint256 brandRefund)",
  "function getCampaign(uint256 campaignId) external view returns (tuple(address brand, address creator, uint256 escrowAmount, uint256 creatorBps, uint256 managerBps, address manager, uint256 referralBps, address referralAddress, uint256 outcomeValue, string metadata, uint8 status, uint256 createdAt, uint256 outcomeAt))",
  "function getBrandCampaigns(address brand) external view returns (uint256[])",
  "function getCreatorCampaigns(address creator) external view returns (uint256[])",
  "event CampaignCreated(uint256 indexed campaignId, address indexed brand, address indexed creator, uint256 escrowAmount)",
  "event OutcomeReported(uint256 indexed campaignId, uint256 outcomeValue)",
  "event CampaignSettled(uint256 indexed campaignId, uint256 creatorShare, uint256 managerShare, uint256 referralShare, uint256 protocolFee)",
  "event CampaignDisputed(uint256 indexed campaignId, address indexed disputer)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];

export enum CampaignStatus {
  ACTIVE = 0,
  OUTCOME_REPORTED = 1,
  SETTLED = 2,
  DISPUTED = 3,
  REFUNDED = 4,
}

export interface Campaign {
  brand: string;
  creator: string;
  escrowAmount: bigint;
  creatorBps: bigint;
  managerBps: bigint;
  manager: string;
  referralBps: bigint;
  referralAddress: string;
  outcomeValue: bigint;
  metadata: string;
  status: CampaignStatus;
  createdAt: bigint;
  outcomeAt: bigint;
}

export interface SettlementPreview {
  creatorShare: bigint;
  managerShare: bigint;
  referralShare: bigint;
  protocolFee: bigint;
  brandRefund: bigint;
}

export interface CreateCampaignParams {
  creator: string;
  category: string;
  contentType: string;
  escrowAmount: bigint;       // USDC 6 decimals
  creatorBps: number;         // e.g. 7000 = 70%
  managerBps: number;         // e.g. 1000 = 10%
  manager: string;
  usdcAddress: string;
}

export class PrmissionCampaigns {
  private contract: ethers.Contract;
  private signer: ethers.Signer;

  constructor(extensionAddress: string, signer: ethers.Signer) {
    this.contract = new ethers.Contract(extensionAddress, EXTENSION_ABI, signer);
    this.signer = signer;
  }

  async createCampaign(params: CreateCampaignParams): Promise<{ campaignId: bigint; receipt: ethers.TransactionReceipt }> {
    // Approve USDC spend first
    const usdc = new ethers.Contract(params.usdcAddress, ERC20_ABI, this.signer);
    const signerAddress = await this.signer.getAddress();
    const contractAddress = await this.contract.getAddress();
    const allowance = await usdc.allowance(signerAddress, contractAddress);
    if (allowance < params.escrowAmount) {
      const approveTx = await usdc.approve(contractAddress, params.escrowAmount);
      await approveTx.wait();
    }

    const tx = await this.contract.createCampaign(
      params.creator,
      params.category,
      params.contentType,
      params.escrowAmount,
      params.creatorBps,
      params.managerBps,
      params.manager
    );
    const receipt = await tx.wait();

    // Parse campaignId from CampaignCreated event
    const iface = new ethers.Interface(EXTENSION_ABI);
    let campaignId = 0n;
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "CampaignCreated") {
          campaignId = parsed.args.campaignId;
        }
      } catch {}
    }

    return { campaignId, receipt };
  }

  async reportOutcome(campaignId: bigint, outcomeValue: bigint, metadata: string): Promise<ethers.TransactionReceipt> {
    const tx = await this.contract.reportOutcome(campaignId, outcomeValue, metadata);
    return tx.wait();
  }

  async settle(campaignId: bigint): Promise<ethers.TransactionReceipt> {
    const tx = await this.contract.settle(campaignId);
    return tx.wait();
  }

  async dispute(campaignId: bigint): Promise<ethers.TransactionReceipt> {
    const tx = await this.contract.dispute(campaignId);
    return tx.wait();
  }

  async previewSettlement(campaignId: bigint): Promise<SettlementPreview> {
    const r = await this.contract.previewSettlement(campaignId);
    return {
      creatorShare: r.creatorShare,
      managerShare: r.managerShare,
      referralShare: r.referralShare,
      protocolFee: r.protocolFee,
      brandRefund: r.brandRefund,
    };
  }

  async getCampaign(campaignId: bigint): Promise<Campaign> {
    const c = await this.contract.getCampaign(campaignId);
    return {
      brand: c.brand,
      creator: c.creator,
      escrowAmount: c.escrowAmount,
      creatorBps: c.creatorBps,
      managerBps: c.managerBps,
      manager: c.manager,
      referralBps: c.referralBps,
      referralAddress: c.referralAddress,
      outcomeValue: c.outcomeValue,
      metadata: c.metadata,
      status: c.status,
      createdAt: c.createdAt,
      outcomeAt: c.outcomeAt,
    };
  }

  async getBrandCampaigns(brand: string): Promise<bigint[]> {
    return this.contract.getBrandCampaigns(brand);
  }

  async getCreatorCampaigns(creator: string): Promise<bigint[]> {
    return this.contract.getCreatorCampaigns(creator);
  }
}
