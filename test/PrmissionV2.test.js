const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("PrmissionV2 Protocol + ERC-8004", function () {
  let prmission, usdc, identityRegistry, reputationRegistry;
  let owner, user, agent, agent2, treasury, reviewer, random;

  const USDC = (n) => ethers.parseUnits(n.toString(), 6);
  const DAY = 86400;

  beforeEach(async function () {
    [owner, user, agent, agent2, treasury, reviewer, random] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    // Deploy PrmissionV2
    const PrmissionV2 = await ethers.getContractFactory("PrmissionV2");
    prmission = await PrmissionV2.deploy(await usdc.getAddress(), treasury.address);

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
  // V2 FIX: C-1 — Settlement calculates from escrow amount, not outcomeValue
  // Agent can no longer game the payout by reporting outcomeValue=0
  // ═══════════════════════════════════════════════════════════════════

  describe("C-1 Fix: Payout from escrow amount", function () {
    it("should calculate user share from escrow amount, not outcomeValue", async function () {
      // 2% compensation = 200 bps
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      await prmission.connect(agent).depositEscrow(1, USDC(100), 0);

      // Agent reports outcomeValue=0 (trying to game)
      await prmission.connect(agent).reportOutcome(1, 0, "booking", "Flight");
      await time.increase(DAY + 1);

      const userBefore = await usdc.balanceOf(user.address);
      const treasuryBefore = await usdc.balanceOf(treasury.address);
      const agentBefore = await usdc.balanceOf(agent.address);

      await prmission.connect(agent).settle(1);

      // V2: User gets 2% of $100 escrow = $2 (not 2% of $0)
      expect(await usdc.balanceOf(user.address) - userBefore).to.equal(USDC(2));
      // Protocol gets 3% of $100 = $3
      expect(await usdc.balanceOf(treasury.address) - treasuryBefore).to.equal(USDC(3));
      // Agent gets $100 - $2 - $3 = $95
      expect(await usdc.balanceOf(agent.address) - agentBefore).to.equal(USDC(95));
    });

    it("should pay correct amounts on full settlement flow", async function () {
      // 10% compensation = 1000 bps
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "data", "analytics", 1000, 0, DAY * 30
      );
      await prmission.connect(agent).depositEscrow(1, USDC(200), 0);
      await prmission.connect(agent).reportOutcome(1, USDC(200), "analytics", "Report");
      await time.increase(DAY + 1);

      const userBefore = await usdc.balanceOf(user.address);
      const treasuryBefore = await usdc.balanceOf(treasury.address);
      const agentBefore = await usdc.balanceOf(agent.address);

      await prmission.connect(user).settle(1);

      // User: 10% of $200 = $20
      expect(await usdc.balanceOf(user.address) - userBefore).to.equal(USDC(20));
      // Protocol: 3% of $200 = $6
      expect(await usdc.balanceOf(treasury.address) - treasuryBefore).to.equal(USDC(6));
      // Agent: $200 - $20 - $6 = $174
      expect(await usdc.balanceOf(agent.address) - agentBefore).to.equal(USDC(174));
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // V2 FIX: C-2 — outcomeValue capped at escrow amount
  // No more permanent fund lock from overclaimed outcomes
  // ═══════════════════════════════════════════════════════════════════

  describe("C-2 Fix: outcomeValue capped", function () {
    it("should cap outcomeValue at escrow amount", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      await prmission.connect(agent).depositEscrow(1, USDC(50), 0);

      // Report outcome way higher than escrow
      await prmission.connect(agent).reportOutcome(1, USDC(99999), "booking", "Flight");

      // Check stored value is capped
      const esc = await prmission.escrows(1);
      expect(esc.outcomeValue).to.equal(USDC(50));
    });

    it("should still settle after capped outcome", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      await prmission.connect(agent).depositEscrow(1, USDC(50), 0);
      await prmission.connect(agent).reportOutcome(1, USDC(99999), "booking", "Flight");
      await time.increase(DAY + 1);

      // Should NOT revert (V1 would revert here)
      await expect(prmission.connect(agent).settle(1)).to.not.be.reverted;
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // V2 FIX: C-3 — Flexible dispute resolution
  // Owner can split any way, protocol always gets 3%
  // ═══════════════════════════════════════════════════════════════════

  describe("C-3 Fix: Flexible dispute resolution", function () {
    beforeEach(async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      await prmission.connect(agent).depositEscrow(1, USDC(100), 0);
      await prmission.connect(agent).reportOutcome(1, USDC(100), "booking", "Flight");
      await prmission.connect(user).disputeSettlement(1, "Wrong amount");
    });

    it("should resolve 100% for user (protocol still gets fee)", async function () {
      const userBefore = await usdc.balanceOf(user.address);
      const treasuryBefore = await usdc.balanceOf(treasury.address);

      await prmission.resolveDispute(1, 10000); // 100% to user

      // Protocol: 3% of $100 = $3
      expect(await usdc.balanceOf(treasury.address) - treasuryBefore).to.equal(USDC(3));
      // User: $100 - $3 = $97
      expect(await usdc.balanceOf(user.address) - userBefore).to.equal(USDC(97));
    });

    it("should resolve 50/50 split", async function () {
      const userBefore = await usdc.balanceOf(user.address);
      const agentBefore = await usdc.balanceOf(agent.address);
      const treasuryBefore = await usdc.balanceOf(treasury.address);

      await prmission.resolveDispute(1, 5000); // 50% to user

      // Protocol: $3
      expect(await usdc.balanceOf(treasury.address) - treasuryBefore).to.equal(USDC(3));
      // Distributable: $97. User: 50% of $97 = $48.5 → rounds to $48 (USDC 6 decimals)
      const userGot = await usdc.balanceOf(user.address) - userBefore;
      const agentGot = await usdc.balanceOf(agent.address) - agentBefore;
      expect(userGot + agentGot).to.equal(USDC(97));
    });

    it("should resolve 100% for agent", async function () {
      const agentBefore = await usdc.balanceOf(agent.address);
      const treasuryBefore = await usdc.balanceOf(treasury.address);

      await prmission.resolveDispute(1, 0); // 0% to user

      // Protocol still gets fee
      expect(await usdc.balanceOf(treasury.address) - treasuryBefore).to.equal(USDC(3));
      // Agent: $97
      expect(await usdc.balanceOf(agent.address) - agentBefore).to.equal(USDC(97));
    });

    it("should reject non-owner resolve", async function () {
      await expect(
        prmission.connect(agent).resolveDispute(1, 5000)
      ).to.be.revertedWithCustomError(prmission, "OwnableUnauthorizedAccount");
    });

    it("should reject resolve on non-disputed escrow", async function () {
      // Create a second non-disputed escrow
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "data", "analytics", 200, 0, DAY * 30
      );
      await prmission.connect(agent).depositEscrow(2, USDC(50), 0);

      await expect(
        prmission.resolveDispute(2, 5000)
      ).to.be.revertedWithCustomError(prmission, "NotDisputed");
    });

    it("should reject userBps over 10000", async function () {
      await expect(
        prmission.resolveDispute(1, 10001)
      ).to.be.revertedWith("userBps exceeds 100%");
    });

    it("should emit DisputeResolved event", async function () {
      await expect(prmission.resolveDispute(1, 5000))
        .to.emit(prmission, "DisputeResolved");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // V2 FIX: H-1 — Settle restricted to involved parties
  // ═══════════════════════════════════════════════════════════════════

  describe("H-1 Fix: Settle access control", function () {
    beforeEach(async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      await prmission.connect(agent).depositEscrow(1, USDC(50), 0);
      await prmission.connect(agent).reportOutcome(1, USDC(50), "booking", "Flight");
      await time.increase(DAY + 1);
    });

    it("should allow agent to settle", async function () {
      await expect(prmission.connect(agent).settle(1)).to.not.be.reverted;
    });

    it("should allow user to settle", async function () {
      await expect(prmission.connect(user).settle(1)).to.not.be.reverted;
    });

    it("should allow owner to settle", async function () {
      await expect(prmission.connect(owner).settle(1)).to.not.be.reverted;
    });

    it("should reject random address from settling", async function () {
      await expect(
        prmission.connect(random).settle(1)
      ).to.be.revertedWith("Not authorized to settle");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // V2 FIX: H-2 — Revoke auto-detects expiry
  // ═══════════════════════════════════════════════════════════════════

  describe("H-2 Fix: Revoke auto-detects expiry", function () {
    it("should set status to EXPIRED when revoking after validUntil", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, 60 // 60 seconds
      );
      await time.increase(120);

      await prmission.connect(user).revokePermission(1);

      const perm = await prmission.permissions(1);
      expect(perm.status).to.equal(3); // EXPIRED, not REVOKED
    });

    it("should emit PermissionExpired event", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, 60
      );
      await time.increase(120);

      await expect(prmission.connect(user).revokePermission(1))
        .to.emit(prmission, "PermissionExpired");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // V2 FIX: H-3 — Outcome reporting works after revocation
  // ═══════════════════════════════════════════════════════════════════

  describe("H-3 Fix: Outcome after revocation", function () {
    it("should allow outcome reporting after permission revoked", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      await prmission.connect(agent).depositEscrow(1, USDC(50), 0);

      // User revokes
      await prmission.connect(user).revokePermission(1);

      // Agent can still report (V1 would revert here)
      await expect(
        prmission.connect(agent).reportOutcome(1, USDC(50), "booking", "Flight")
      ).to.not.be.reverted;
    });

    it("should allow full settlement after revocation", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      await prmission.connect(agent).depositEscrow(1, USDC(50), 0);
      await prmission.connect(user).revokePermission(1);

      await prmission.connect(agent).reportOutcome(1, USDC(50), "booking", "Flight");
      await time.increase(DAY + 1);

      await expect(prmission.connect(agent).settle(1)).to.not.be.reverted;
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // V2 FIX: H-4 — Trusted reviewers array capped
  // ═══════════════════════════════════════════════════════════════════

  describe("H-4 Fix: Reviewer array cap", function () {
    it("should reject more than 50 reviewers", async function () {
      const tooMany = Array(51).fill(reviewer.address);
      await expect(
        prmission.setTrustedReviewers(tooMany)
      ).to.be.revertedWithCustomError(prmission, "TooManyReviewers");
    });

    it("should accept exactly 50 reviewers", async function () {
      const maxReviewers = Array(50).fill(reviewer.address);
      await expect(prmission.setTrustedReviewers(maxReviewers)).to.not.be.reverted;
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // V2 FIX: M-1 — Revocation grace period enforced
  // ═══════════════════════════════════════════════════════════════════

  describe("M-1 Fix: Revocation grace period", function () {
    it("should not allow refund during grace period", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      await prmission.connect(agent).depositEscrow(1, USDC(50), 0);
      await prmission.connect(user).revokePermission(1);

      // Immediately try refund — should fail (within 60s grace)
      await expect(
        prmission.refundEscrow(1)
      ).to.be.revertedWith("Not refundable");
    });

    it("should allow refund after grace period", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      await prmission.connect(agent).depositEscrow(1, USDC(50), 0);
      await prmission.connect(user).revokePermission(1);

      // Wait past grace
      await time.increase(61);

      await expect(prmission.refundEscrow(1)).to.not.be.reverted;
      expect(await usdc.balanceOf(agent.address)).to.equal(USDC(10000));
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // V2 FIX: M-2 — Token rescue
  // ═══════════════════════════════════════════════════════════════════

  describe("M-2 Fix: Token rescue", function () {
    it("should rescue accidental tokens", async function () {
      // Deploy a second token and send it to the contract by accident
      const MockUSDC2 = await ethers.getContractFactory("MockUSDC");
      const randomToken = await MockUSDC2.deploy();
      await randomToken.mint(await prmission.getAddress(), USDC(500));

      const treasuryBefore = await randomToken.balanceOf(treasury.address);
      await prmission.rescueTokens(await randomToken.getAddress(), USDC(500));
      expect(await randomToken.balanceOf(treasury.address) - treasuryBefore).to.equal(USDC(500));
    });

    it("should not allow rescuing payment token", async function () {
      await expect(
        prmission.rescueTokens(await usdc.getAddress(), USDC(1))
      ).to.be.revertedWith("Cannot rescue payment token");
    });

    it("should only allow owner to rescue", async function () {
      await expect(
        prmission.connect(agent).rescueTokens(await usdc.getAddress(), USDC(1))
      ).to.be.revertedWithCustomError(prmission, "OwnableUnauthorizedAccount");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // V2 FIX: M-3 — Paginated user permissions
  // ═══════════════════════════════════════════════════════════════════

  describe("M-3 Fix: Pagination", function () {
    beforeEach(async function () {
      // Create 5 permissions
      for (let i = 0; i < 5; i++) {
        await prmission.connect(user).grantPermission(
          ethers.ZeroAddress, `category_${i}`, "test", 200, 0, DAY * 30
        );
      }
    });

    it("should return paginated results", async function () {
      const page1 = await prmission.getUserPermissions(user.address, 0, 2);
      expect(page1.length).to.equal(2);
      expect(page1[0]).to.equal(1);
      expect(page1[1]).to.equal(2);

      const page2 = await prmission.getUserPermissions(user.address, 2, 2);
      expect(page2.length).to.equal(2);
      expect(page2[0]).to.equal(3);
      expect(page2[1]).to.equal(4);
    });

    it("should handle offset beyond array", async function () {
      const result = await prmission.getUserPermissions(user.address, 100, 10);
      expect(result.length).to.equal(0);
    });

    it("should handle limit exceeding remaining", async function () {
      const result = await prmission.getUserPermissions(user.address, 3, 100);
      expect(result.length).to.equal(2); // Only 2 remaining (index 3,4)
    });

    it("should return correct permission count", async function () {
      expect(await prmission.getUserPermissionCount(user.address)).to.equal(5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // V2 FIX: M-6 — Permission escrow tracking
  // ═══════════════════════════════════════════════════════════════════

  describe("M-6 Fix: Escrow tracking per permission", function () {
    it("should track multiple escrows per permission", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );

      await prmission.connect(agent).depositEscrow(1, USDC(50), 0);
      await prmission.connect(agent).depositEscrow(1, USDC(75), 0);
      await prmission.connect(agent2).depositEscrow(1, USDC(100), 0);

      const escrowIds = await prmission.getPermissionEscrows(1);
      expect(escrowIds.length).to.equal(3);
      expect(escrowIds[0]).to.equal(1);
      expect(escrowIds[1]).to.equal(2);
      expect(escrowIds[2]).to.equal(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // V2: Pausable
  // ═══════════════════════════════════════════════════════════════════

  describe("Pausable", function () {
    it("should pause and block new permissions", async function () {
      await prmission.pause();

      await expect(
        prmission.connect(user).grantPermission(
          ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
        )
      ).to.be.revertedWithCustomError(prmission, "EnforcedPause");
    });

    it("should pause and block new escrows", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      await prmission.pause();

      await expect(
        prmission.connect(agent).depositEscrow(1, USDC(50), 0)
      ).to.be.revertedWithCustomError(prmission, "EnforcedPause");
    });

    it("should unpause and resume operations", async function () {
      await prmission.pause();
      await prmission.unpause();

      await expect(
        prmission.connect(user).grantPermission(
          ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
        )
      ).to.not.be.reverted;
    });

    it("should only allow owner to pause", async function () {
      await expect(
        prmission.connect(agent).pause()
      ).to.be.revertedWithCustomError(prmission, "OwnableUnauthorizedAccount");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // V2: Volume tracking
  // ═══════════════════════════════════════════════════════════════════

  describe("Volume tracking", function () {
    it("should track total settled volume", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      await prmission.connect(agent).depositEscrow(1, USDC(100), 0);
      await prmission.connect(agent).reportOutcome(1, USDC(100), "booking", "Flight");
      await time.increase(DAY + 1);
      await prmission.connect(agent).settle(1);

      expect(await prmission.totalSettledVolume()).to.equal(USDC(100));
      expect(await prmission.totalProtocolFees()).to.equal(USDC(3));
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // V2: Backward compatibility — all V1 flows still work
  // ═══════════════════════════════════════════════════════════════════

  describe("Backward Compatible (no ERC-8004)", function () {
    it("should grant permission", async function () {
      const tx = await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel_preferences", "personalized_offer", 200, 0, DAY * 30
      );
      expect((await tx.wait()).status).to.equal(1);
    });

    it("should deposit escrow with agentId=0 when identity not enforced", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel_preferences", "booking", 200, 0, DAY * 30
      );
      const tx = await prmission.connect(agent).depositEscrow(1, USDC(50), 0);
      expect((await tx.wait()).status).to.equal(1);
    });

    it("should handle full settlement flow", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      await prmission.connect(agent).depositEscrow(1, USDC(50), 0);
      await prmission.connect(agent).reportOutcome(1, USDC(50), "booking", "Flight");
      await time.increase(DAY + 1);

      const userBefore = await usdc.balanceOf(user.address);
      const treasuryBefore = await usdc.balanceOf(treasury.address);
      const agentBefore = await usdc.balanceOf(agent.address);

      await prmission.connect(agent).settle(1);

      // V2: 2% of $50 escrow = $1
      expect(await usdc.balanceOf(user.address) - userBefore).to.equal(USDC(1));
      // 3% of $50 = $1.5
      expect(await usdc.balanceOf(treasury.address) - treasuryBefore).to.equal(USDC(1.5));
      // $50 - $1 - $1.5 = $47.5
      expect(await usdc.balanceOf(agent.address) - agentBefore).to.equal(USDC(47.5));
    });

    it("should reject expired permission", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, 60
      );
      await time.increase(120);
      await expect(
        prmission.connect(agent).depositEscrow(1, USDC(50), 0)
      ).to.be.revertedWithCustomError(prmission, "PermissionExpiredErr");
    });

    it("should block unauthorized merchant", async function () {
      await prmission.connect(user).grantPermission(
        agent.address, "travel", "booking", 200, 0, DAY * 30
      );
      await expect(
        prmission.connect(agent2).depositEscrow(1, USDC(50), 0)
      ).to.be.revertedWithCustomError(prmission, "NotAuthorizedMerchant");
    });

    it("should pay upfront fee on deposit", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, USDC(5), DAY * 30
      );
      const userBefore = await usdc.balanceOf(user.address);
      await prmission.connect(agent).depositEscrow(1, USDC(50), 0);
      expect(await usdc.balanceOf(user.address) - userBefore).to.equal(USDC(5));
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
  // V2: ERC-8004 Identity (same as V1)
  // ═══════════════════════════════════════════════════════════════════

  describe("ERC-8004 Identity Enforcement", function () {
    beforeEach(async function () {
      await prmission.setIdentityRegistry(await identityRegistry.getAddress());
      await prmission.setIdentityEnforcement(true);
    });

    it("should reject deposit with agentId=0 when enforced", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      await expect(
        prmission.connect(agent).depositEscrow(1, USDC(50), 0)
      ).to.be.revertedWithCustomError(prmission, "AgentIdRequired");
    });

    it("should accept deposit from registered agent", async function () {
      await identityRegistry.connect(agent).register("https://agent.example/card.json");
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      const tx = await prmission.connect(agent).depositEscrow(1, USDC(50), 1);
      expect((await tx.wait()).status).to.equal(1);
    });

    it("should reject deposit from wrong address", async function () {
      await identityRegistry.connect(agent).register("https://agent.example/card.json");
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      await expect(
        prmission.connect(agent2).depositEscrow(1, USDC(50), 1)
      ).to.be.revertedWithCustomError(prmission, "NotAgentOwnerOrWallet");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // V2: Constructor validation
  // ═══════════════════════════════════════════════════════════════════

  describe("Constructor validation", function () {
    it("should reject zero payment token", async function () {
      const PrmissionV2 = await ethers.getContractFactory("PrmissionV2");
      await expect(
        PrmissionV2.deploy(ethers.ZeroAddress, treasury.address)
      ).to.be.revertedWithCustomError(PrmissionV2, "InvalidAddress");
    });

    it("should reject zero treasury", async function () {
      const PrmissionV2 = await ethers.getContractFactory("PrmissionV2");
      await expect(
        PrmissionV2.deploy(await usdc.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(PrmissionV2, "InvalidAddress");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // V2: Input validation
  // ═══════════════════════════════════════════════════════════════════

  describe("Input validation", function () {
    it("should reject empty data category", async function () {
      await expect(
        prmission.connect(user).grantPermission(
          ethers.ZeroAddress, "", "purpose", 200, 0, DAY * 30
        )
      ).to.be.revertedWithCustomError(prmission, "EmptyString");
    });

    it("should reject compensation over 50%", async function () {
      await expect(
        prmission.connect(user).grantPermission(
          ethers.ZeroAddress, "travel", "booking", 5001, 0, DAY * 30
        )
      ).to.be.revertedWithCustomError(prmission, "CompensationTooHigh");
    });

    it("should reject zero escrow amount", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress, "travel", "booking", 200, 0, DAY * 30
      );
      await expect(
        prmission.connect(agent).depositEscrow(1, 0, 0)
      ).to.be.revertedWithCustomError(prmission, "ZeroValue");
    });
  });
});
