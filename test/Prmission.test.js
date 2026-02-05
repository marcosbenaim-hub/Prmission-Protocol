const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Prmission Protocol + ERC-8004", function () {
  let prmission, usdc, identityRegistry, reputationRegistry;
  let owner, user, agent, agent2, treasury, reviewer;

  const USDC = (n) => ethers.parseUnits(n.toString(), 6);
  const DAY = 86400;

  beforeEach(async function () {
    [owner, user, agent, agent2, treasury, reviewer] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    // Deploy Prmission
    const Prmission = await ethers.getContractFactory("Prmission");
    prmission = await Prmission.deploy(await usdc.getAddress(), treasury.address);

    // Deploy ERC-8004 mocks
    const MockIdentity = await ethers.getContractFactory("MockIdentityRegistry");
    identityRegistry = await MockIdentity.deploy();

    const MockReputation = await ethers.getContractFactory("MockReputationRegistry");
    reputationRegistry = await MockReputation.deploy();
    await reputationRegistry.initialize(await identityRegistry.getAddress());

    // Fund agents with USDC
    await usdc.mint(agent.address, USDC(10000));
    await usdc.mint(agent2.address, USDC(10000));
    await usdc.connect(agent).approve(await prmission.getAddress(), USDC(10000));
    await usdc.connect(agent2).approve(await prmission.getAddress(), USDC(10000));
  });

  // ═══════════════════════════════════════════════════════════════════
  // BACKWARD COMPATIBLE MODE (identity NOT enforced)
  // All original tests still pass. Nothing broke.
  // ═══════════════════════════════════════════════════════════════════

  describe("Backward Compatible (no ERC-8004)", function () {
    it("should grant permission", async function () {
      const tx = await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel_preferences", "personalized_offer", 200, 0, DAY * 30
      );
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    it("should deposit escrow with agentId=0 when identity not enforced", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel_preferences", "booking", 200, 0, DAY * 30
      );
      const tx = await prmission.connect(agent).depositEscrow(1, USDC(50), 0);
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    it("should run full settlement flow without ERC-8004", async function () {
      // Grant
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel_preferences", "booking", 200, 0, DAY * 30
      );

      // Deposit escrow
      await prmission.connect(agent).depositEscrow(1, USDC(50), 0);

      // Report outcome ($500 flight)
      await prmission.connect(agent).reportOutcome(1, USDC(500), "booking", "Flight LAX-NYC");

      // Wait for dispute window
      await time.increase(DAY + 1);

      // Settle
      const userBefore = await usdc.balanceOf(user.address);
      const treasuryBefore = await usdc.balanceOf(treasury.address);
      const agentBefore = await usdc.balanceOf(agent.address);

      await prmission.settle(1);

      const userAfter = await usdc.balanceOf(user.address);
      const treasuryAfter = await usdc.balanceOf(treasury.address);
      const agentAfter = await usdc.balanceOf(agent.address);

      // $500 * 2% = $10 to user
      expect(userAfter - userBefore).to.equal(USDC(10));
      // $500 * 3% = $15 to protocol
      expect(treasuryAfter - treasuryBefore).to.equal(USDC(15));
      // $50 - $10 - $15 = $25 back to agent
      expect(agentAfter - agentBefore).to.equal(USDC(25));
    });

    it("should revoke permission and refund escrow", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "search", 200, 0, DAY * 30
      );
      await prmission.connect(agent).depositEscrow(1, USDC(50), 0);
      await prmission.connect(user).revokePermission(1);
      await prmission.refundEscrow(1);
      expect(await usdc.balanceOf(agent.address)).to.equal(USDC(10000));
    });

    it("should reject expired permission", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, 60
      );
      await time.increase(120);
      await expect(
        prmission.connect(agent).depositEscrow(1, USDC(50), 0)
      ).to.be.revertedWith("Permission expired");
    });

    it("should handle dispute flow", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      await prmission.connect(agent).depositEscrow(1, USDC(50), 0);
      await prmission.connect(agent).reportOutcome(1, USDC(500), "booking", "Flight");

      await prmission.connect(user).disputeSettlement(1, "Wrong amount");

      const esc = await prmission.escrows(1);
      expect(esc.status).to.equal(3); // DISPUTED

      // Resolve in user's favor (slash)
      await prmission.resolveDisputeForUser(1);
      expect(await usdc.balanceOf(user.address)).to.equal(USDC(50));
    });

    it("should block unauthorized merchant", async function () {
      await prmission.connect(user).grantPermission(
        agent.address, "travel", "booking", 200, 0, DAY * 30
      );
      await expect(
        prmission.connect(agent2).depositEscrow(1, USDC(50), 0)
      ).to.be.revertedWith("Not authorized merchant");
    });

    it("should pay upfront fee on deposit", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, USDC(5), DAY * 30
      );
      const userBefore = await usdc.balanceOf(user.address);
      await prmission.connect(agent).depositEscrow(1, USDC(50), 0);
      const userAfter = await usdc.balanceOf(user.address);
      expect(userAfter - userBefore).to.equal(USDC(5));
    });

    it("should expire stale permissions", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, 60
      );
      await time.increase(120);
      await prmission.expirePermission(1);
      const perm = await prmission.permissions(1);
      expect(perm.status).to.equal(3); // EXPIRED
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // ERC-8004 IDENTITY ENFORCEMENT
  // Only registered agents can deposit escrow.
  // ═══════════════════════════════════════════════════════════════════

  describe("ERC-8004 Identity Enforcement", function () {
    beforeEach(async function () {
      // Wire up ERC-8004
      await prmission.setIdentityRegistry(await identityRegistry.getAddress());
      await prmission.setIdentityEnforcement(true);
    });

    it("should reject deposit from unregistered agent", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      await expect(
        prmission.connect(agent).depositEscrow(1, USDC(50), 999)
      ).to.be.revertedWith("Agent not registered");
    });

    it("should reject deposit with agentId=0 when enforced", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      await expect(
        prmission.connect(agent).depositEscrow(1, USDC(50), 0)
      ).to.be.revertedWith("Agent ID required");
    });

    it("should accept deposit from registered agent (owner)", async function () {
      // Register agent in ERC-8004
      const tx = await identityRegistry.connect(agent).register("https://agent.example/card.json");
      const receipt = await tx.wait();
      const agentId = 1; // first registration

      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );

      const depositTx = await prmission.connect(agent).depositEscrow(1, USDC(50), agentId);
      const depositReceipt = await depositTx.wait();
      expect(depositReceipt.status).to.equal(1);

      // Verify agentId stored in escrow
      const esc = await prmission.escrows(1);
      expect(esc.agentId).to.equal(agentId);
    });

    it("should accept deposit from agent wallet (not owner)", async function () {
      // Owner registers, sets agent2 as wallet
      await identityRegistry.connect(owner).register("https://agent.example/card.json");
      await identityRegistry.setAgentWallet(1, agent.address);

      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );

      // agent (the wallet) deposits, not owner
      const tx = await prmission.connect(agent).depositEscrow(1, USDC(50), 1);
      expect((await tx.wait()).status).to.equal(1);
    });

    it("should reject deposit from wrong address", async function () {
      await identityRegistry.connect(agent).register("https://agent.example/card.json");

      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );

      // agent2 tries to use agent's agentId
      await expect(
        prmission.connect(agent2).depositEscrow(1, USDC(50), 1)
      ).to.be.revertedWith("Not agent owner or wallet");
    });

    it("should run full flow with ERC-8004 identity", async function () {
      await identityRegistry.connect(agent).register("https://agent.example/card.json");

      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      await prmission.connect(agent).depositEscrow(1, USDC(50), 1);
      await prmission.connect(agent).reportOutcome(1, USDC(500), "booking", "Flight");
      await time.increase(DAY + 1);

      const userBefore = await usdc.balanceOf(user.address);
      const treasuryBefore = await usdc.balanceOf(treasury.address);
      await prmission.settle(1);

      expect(await usdc.balanceOf(user.address) - userBefore).to.equal(USDC(10));
      expect(await usdc.balanceOf(treasury.address) - treasuryBefore).to.equal(USDC(15));
    });

    it("should allow disabling enforcement", async function () {
      await prmission.setIdentityEnforcement(false);

      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      // Works with agentId=0 again
      const tx = await prmission.connect(agent).depositEscrow(1, USDC(50), 0);
      expect((await tx.wait()).status).to.equal(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // ERC-8004 REPUTATION ENFORCEMENT
  // Registered agents must also meet minimum reputation.
  // ═══════════════════════════════════════════════════════════════════

  describe("ERC-8004 Reputation Enforcement", function () {
    let agentId;

    beforeEach(async function () {
      // Wire up ERC-8004
      await prmission.setIdentityRegistry(await identityRegistry.getAddress());
      await prmission.setReputationRegistry(await reputationRegistry.getAddress());
      await prmission.setIdentityEnforcement(true);
      await prmission.setTrustedReviewers([reviewer.address]);
      // Min score 50, 0 decimals
      await prmission.setReputationEnforcement(true, 50, 0);

      // Register agent
      await identityRegistry.connect(agent).register("https://agent.example/card.json");
      agentId = 1;
    });

    it("should reject agent with no reputation", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      await expect(
        prmission.connect(agent).depositEscrow(1, USDC(50), agentId)
      ).to.be.revertedWith("Agent has no reputation");
    });

    it("should reject agent below minimum reputation", async function () {
      // Give low score (30, below min of 50)
      await reputationRegistry.connect(reviewer).setScore(agentId, 30);

      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      await expect(
        prmission.connect(agent).depositEscrow(1, USDC(50), agentId)
      ).to.be.revertedWith("Agent below minimum reputation");
    });

    it("should accept agent meeting minimum reputation", async function () {
      // Give good score (85, above min of 50)
      await reputationRegistry.connect(reviewer).setScore(agentId, 85);

      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      const tx = await prmission.connect(agent).depositEscrow(1, USDC(50), agentId);
      expect((await tx.wait()).status).to.equal(1);
    });

    it("should run full flow with identity + reputation", async function () {
      // Good reputation
      await reputationRegistry.connect(reviewer).setScore(agentId, 90);

      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      await prmission.connect(agent).depositEscrow(1, USDC(50), agentId);
      await prmission.connect(agent).reportOutcome(1, USDC(500), "booking", "Flight LAX-NYC");
      await time.increase(DAY + 1);

      const userBefore = await usdc.balanceOf(user.address);
      const treasuryBefore = await usdc.balanceOf(treasury.address);
      const agentBefore = await usdc.balanceOf(agent.address);

      await prmission.settle(1);

      expect(await usdc.balanceOf(user.address) - userBefore).to.equal(USDC(10));
      expect(await usdc.balanceOf(treasury.address) - treasuryBefore).to.equal(USDC(15));
      expect(await usdc.balanceOf(agent.address) - agentBefore).to.equal(USDC(25));
    });

    

    it("should allow adjusting minimum reputation", async function () {
      // Score 40 (below 50)
      await reputationRegistry.connect(reviewer).setScore(agentId, 40);

      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );

      // Fails at min 50
      await expect(
        prmission.connect(agent).depositEscrow(1, USDC(50), agentId)
      ).to.be.revertedWith("Agent below minimum reputation");

      // Lower minimum to 30
      await prmission.setReputationEnforcement(true, 30, 0);

      // Now passes
      const tx = await prmission.connect(agent).depositEscrow(1, USDC(50), agentId);
      expect((await tx.wait()).status).to.equal(1);
    });

    it("should allow disabling reputation enforcement", async function () {
      // No reputation, but disable check
      await prmission.setReputationEnforcement(false, 0, 0);

      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );

      // Identity still enforced, but no reputation needed
      const tx = await prmission.connect(agent).depositEscrow(1, USDC(50), agentId);
      expect((await tx.wait()).status).to.equal(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // checkAgentTrust VIEW FUNCTION
  // Pre-check trust without depositing.
  // ═══════════════════════════════════════════════════════════════════

  describe("checkAgentTrust", function () {
    it("should return false for unregistered agent", async function () {
      await prmission.setIdentityRegistry(await identityRegistry.getAddress());

      const [registered, authorized, reputable, repScore, repCount] =
        await prmission.checkAgentTrust(999, agent.address);

      expect(registered).to.be.false;
      expect(authorized).to.be.false;
      expect(reputable).to.be.false;
    });

    it("should return registered+authorized for valid agent", async function () {
      await prmission.setIdentityRegistry(await identityRegistry.getAddress());
      await identityRegistry.connect(agent).register("https://agent.example/card.json");

      const [registered, authorized, reputable, repScore, repCount] =
        await prmission.checkAgentTrust(1, agent.address);

      expect(registered).to.be.true;
      expect(authorized).to.be.true;
    });

    it("should return full trust profile with reputation", async function () {
      await prmission.setIdentityRegistry(await identityRegistry.getAddress());
      await prmission.setReputationRegistry(await reputationRegistry.getAddress());
      await prmission.setTrustedReviewers([reviewer.address]);
      await prmission.setReputationEnforcement(true, 50, 0);

      await identityRegistry.connect(agent).register("https://agent.example/card.json");
      await reputationRegistry.connect(reviewer).setScore(1, 85);

      const [registered, authorized, reputable, repScore, repCount] =
        await prmission.checkAgentTrust(1, agent.address);

      expect(registered).to.be.true;
      expect(authorized).to.be.true;
      expect(reputable).to.be.true;
      expect(repScore).to.equal(85);
      expect(repCount).to.equal(1);
    });

    it("should detect wrong address for registered agent", async function () {
      await prmission.setIdentityRegistry(await identityRegistry.getAddress());
      await identityRegistry.connect(agent).register("https://agent.example/card.json");

      const [registered, authorized, , ,] =
        await prmission.checkAgentTrust(1, agent2.address);

      expect(registered).to.be.true;
      expect(authorized).to.be.false;
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // ADMIN FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════

  describe("Admin", function () {
    it("should only allow owner to set identity registry", async function () {
      await expect(
        prmission.connect(agent).setIdentityRegistry(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(prmission, "OwnableUnauthorizedAccount");
    });

    it("should only allow owner to set reputation registry", async function () {
      await expect(
        prmission.connect(agent).setReputationRegistry(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(prmission, "OwnableUnauthorizedAccount");
    });

    it("should only allow owner to toggle identity enforcement", async function () {
      await expect(
        prmission.connect(agent).setIdentityEnforcement(true)
      ).to.be.revertedWithCustomError(prmission, "OwnableUnauthorizedAccount");
    });

    it("should only allow owner to set trusted reviewers", async function () {
      await expect(
        prmission.connect(agent).setTrustedReviewers([reviewer.address])
      ).to.be.revertedWithCustomError(prmission, "OwnableUnauthorizedAccount");
    });

    it("should emit events on config changes", async function () {
      await expect(prmission.setIdentityRegistry(await identityRegistry.getAddress()))
        .to.emit(prmission, "IdentityRegistryUpdated");

      await expect(prmission.setReputationRegistry(await reputationRegistry.getAddress()))
        .to.emit(prmission, "ReputationRegistryUpdated");

      await expect(prmission.setIdentityEnforcement(true))
        .to.emit(prmission, "IdentityEnforcementUpdated").withArgs(true);
    });

    it("should return trusted reviewers", async function () {
      await prmission.setTrustedReviewers([reviewer.address, agent2.address]);
      const reviewers = await prmission.getTrustedReviewers();
      expect(reviewers.length).to.equal(2);
      expect(reviewers[0]).to.equal(reviewer.address);
      expect(reviewers[1]).to.equal(agent2.address);
    });
  });
});
