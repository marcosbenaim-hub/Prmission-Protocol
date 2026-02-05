const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Prmission Protocol", function () {
  let prmission, usdc;
  let owner, user, agent, agent2, treasury;

  const USDC_DECIMALS = 6;
  const toUSDC = (n) => ethers.parseUnits(n.toString(), USDC_DECIMALS);

  const ONE_DAY = 24 * 60 * 60;
  const ONE_WEEK = 7 * ONE_DAY;

  beforeEach(async function () {
    [owner, user, agent, agent2, treasury] = await ethers.getSigners();

    // Deploy mock USDC
    const MockToken = await ethers.getContractFactory("MockUSDC");
    usdc = await MockToken.deploy();
    await usdc.waitForDeployment();

    // Deploy Prmission
    const Prmission = await ethers.getContractFactory("Prmission");
    prmission = await Prmission.deploy(await usdc.getAddress(), treasury.address);
    await prmission.waitForDeployment();

    // Fund agent with USDC
    await usdc.mint(agent.address, toUSDC(10000));
    await usdc.mint(agent2.address, toUSDC(10000));

    // Agent approves Prmission contract
    await usdc.connect(agent).approve(await prmission.getAddress(), toUSDC(10000));
    await usdc.connect(agent2).approve(await prmission.getAddress(), toUSDC(10000));
  });

  // ─── Permission Granting ─────────────────────────────────────────────────

  describe("Permission Granting", function () {
    it("should grant a permission with correct parameters", async function () {
      const tx = await prmission.connect(user).grantPermission(
        agent.address,           // merchant
        "travel_preferences",    // category
        "book_flights",          // purpose
        200,                     // 2% compensation
        toUSDC(0.50),           // $0.50 upfront fee
        ONE_WEEK                 // 1 week validity
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(l => l.fragment?.name === "PermissionGranted");
      expect(event).to.not.be.undefined;

      const perm = await prmission.permissions(1);
      expect(perm.user).to.equal(user.address);
      expect(perm.merchant).to.equal(agent.address);
      expect(perm.dataCategory).to.equal("travel_preferences");
      expect(perm.compensationBps).to.equal(200);
      expect(perm.status).to.equal(1); // ACTIVE
    });

    it("should allow open permissions (any agent)", async function () {
      await prmission.connect(user).grantPermission(
        ethers.ZeroAddress,      // any agent
        "purchase_history",
        "recommendations",
        150,                     // 1.5%
        0,                       // no upfront fee
        ONE_WEEK
      );

      const perm = await prmission.permissions(1);
      expect(perm.merchant).to.equal(ethers.ZeroAddress);
    });

    it("should reject empty category", async function () {
      await expect(
        prmission.connect(user).grantPermission(
          agent.address, "", "purpose", 200, 0, ONE_WEEK
        )
      ).to.be.revertedWith("Empty category");
    });

    it("should reject compensation above 50%", async function () {
      await expect(
        prmission.connect(user).grantPermission(
          agent.address, "data", "purpose", 5100, 0, ONE_WEEK
        )
      ).to.be.revertedWith("Max 50% compensation");
    });
  });

  // ─── Permission Revocation ───────────────────────────────────────────────

  describe("Revocation", function () {
    beforeEach(async function () {
      await prmission.connect(user).grantPermission(
        agent.address, "travel_preferences", "booking", 200, 0, ONE_WEEK
      );
    });

    it("should allow user to revoke their permission", async function () {
      await prmission.connect(user).revokePermission(1);
      const perm = await prmission.permissions(1);
      expect(perm.status).to.equal(2); // REVOKED
    });

    it("should emit revocation with 60-second delete deadline", async function () {
      const tx = await prmission.connect(user).revokePermission(1);
      const receipt = await tx.wait();
      const event = receipt.logs.find(l => l.fragment?.name === "PermissionRevoked");
      expect(event).to.not.be.undefined;
    });

    it("should prevent non-owner from revoking", async function () {
      await expect(
        prmission.connect(agent).revokePermission(1)
      ).to.be.revertedWith("Not your permission");
    });
  });

  // ─── Escrow ──────────────────────────────────────────────────────────────

  describe("Escrow Deposit", function () {
    beforeEach(async function () {
      await prmission.connect(user).grantPermission(
        agent.address, "travel_preferences", "booking", 200, toUSDC(0.50), ONE_WEEK
      );
    });

    it("should deposit escrow and pay upfront fee to user", async function () {
      const userBalBefore = await usdc.balanceOf(user.address);

      await prmission.connect(agent).depositEscrow(1, toUSDC(50));

      const userBalAfter = await usdc.balanceOf(user.address);
      expect(userBalAfter - userBalBefore).to.equal(toUSDC(0.50));

      const esc = await prmission.escrows(1);
      expect(esc.amount).to.equal(toUSDC(50));
      expect(esc.status).to.equal(1); // FUNDED
    });

    it("should reject deposit on revoked permission", async function () {
      await prmission.connect(user).revokePermission(1);
      await expect(
        prmission.connect(agent).depositEscrow(1, toUSDC(50))
      ).to.be.revertedWith("Permission not active");
    });

    it("should reject unauthorized merchant", async function () {
      await expect(
        prmission.connect(agent2).depositEscrow(1, toUSDC(50))
      ).to.be.revertedWith("Not authorized merchant");
    });
  });

  // ─── Full Happy Path ────────────────────────────────────────────────────

  describe("Happy Path: $500 flight booking", function () {
    const escrowAmount = toUSDC(50);   // $50 escrowed
    const outcomeValue = toUSDC(500);  // $500 flight

    beforeEach(async function () {
      // User grants permission: 2% compensation, $0.50 upfront
      await prmission.connect(user).grantPermission(
        agent.address, "travel_preferences", "book_flights", 200, toUSDC(0.50), ONE_WEEK
      );

      // Agent deposits escrow
      await prmission.connect(agent).depositEscrow(1, escrowAmount);
    });

    it("should complete the full flow with correct splits", async function () {
      // Agent reports outcome
      await prmission.connect(agent).reportOutcome(
        1,             // escrowId
        outcomeValue,  // $500
        "booking",
        "Round-trip SFO to JFK on Delta"
      );

      // Fast forward past dispute window
      await time.increase(ONE_DAY + 1);

      // Record balances before settlement
      const userBefore = await usdc.balanceOf(user.address);
      const treasuryBefore = await usdc.balanceOf(treasury.address);
      const agentBefore = await usdc.balanceOf(agent.address);

      // Settle
      await prmission.settle(1);

      const userAfter = await usdc.balanceOf(user.address);
      const treasuryAfter = await usdc.balanceOf(treasury.address);
      const agentAfter = await usdc.balanceOf(agent.address);

      // User gets 2% of $500 = $10
      expect(userAfter - userBefore).to.equal(toUSDC(10));

      // Protocol gets 3% of $500 = $15
      expect(treasuryAfter - treasuryBefore).to.equal(toUSDC(15));

      // Agent gets remainder: $50 - $10 - $15 = $25
      expect(agentAfter - agentBefore).to.equal(toUSDC(25));
    });

    it("should prevent settlement before dispute window ends", async function () {
      await prmission.connect(agent).reportOutcome(1, outcomeValue, "booking", "test");

      await expect(
        prmission.settle(1)
      ).to.be.revertedWith("Dispute window still open");
    });

    it("should allow anyone to trigger settlement after window", async function () {
      await prmission.connect(agent).reportOutcome(1, outcomeValue, "booking", "test");
      await time.increase(ONE_DAY + 1);

      // Random address settles — permissionless
      await expect(prmission.connect(agent2).settle(1)).to.not.be.reverted;
    });
  });

  // ─── Disputes ────────────────────────────────────────────────────────────

  describe("Disputes", function () {
    beforeEach(async function () {
      await prmission.connect(user).grantPermission(
        agent.address, "travel_preferences", "booking", 200, 0, ONE_WEEK
      );
      await prmission.connect(agent).depositEscrow(1, toUSDC(50));
      await prmission.connect(agent).reportOutcome(1, toUSDC(500), "booking", "test");
    });

    it("should allow user to file dispute during window", async function () {
      await prmission.connect(user).disputeSettlement(1, "Unauthorized data use");
      const esc = await prmission.escrows(1);
      expect(esc.status).to.equal(3); // DISPUTED
    });

    it("should allow agent to file dispute during window", async function () {
      await prmission.connect(agent).disputeSettlement(1, "Data was incomplete");
      const esc = await prmission.escrows(1);
      expect(esc.status).to.equal(3); // DISPUTED
    });

    it("should reject dispute after window closes", async function () {
      await time.increase(ONE_DAY + 1);
      await expect(
        prmission.connect(user).disputeSettlement(1, "Too late")
      ).to.be.revertedWith("Dispute window closed");
    });

    it("should allow owner to resolve dispute for user (slash)", async function () {
      await prmission.connect(user).disputeSettlement(1, "Misuse");

      const userBefore = await usdc.balanceOf(user.address);
      await prmission.connect(owner).resolveDisputeForUser(1);
      const userAfter = await usdc.balanceOf(user.address);

      // Entire escrow slashed to user
      expect(userAfter - userBefore).to.equal(toUSDC(50));
    });

    it("should allow owner to refund agent on dispute", async function () {
      await prmission.connect(user).disputeSettlement(1, "False claim");

      const agentBefore = await usdc.balanceOf(agent.address);
      await prmission.connect(owner).refundEscrow(1);
      const agentAfter = await usdc.balanceOf(agent.address);

      expect(agentAfter - agentBefore).to.equal(toUSDC(50));
    });
  });

  // ─── Revocation + Escrow Refund ──────────────────────────────────────────

  describe("Revocation refunds active escrows", function () {
    it("should refund escrow when permission is revoked", async function () {
      await prmission.connect(user).grantPermission(
        agent.address, "data", "purpose", 200, 0, ONE_WEEK
      );
      await prmission.connect(agent).depositEscrow(1, toUSDC(50));

      // User revokes
      await prmission.connect(user).revokePermission(1);

      const agentBefore = await usdc.balanceOf(agent.address);
      await prmission.refundEscrow(1);
      const agentAfter = await usdc.balanceOf(agent.address);

      expect(agentAfter - agentBefore).to.equal(toUSDC(50));
    });
  });

  // ─── View Functions ──────────────────────────────────────────────────────

  describe("Views", function () {
    beforeEach(async function () {
      await prmission.connect(user).grantPermission(
        agent.address, "travel_preferences", "booking", 200, toUSDC(0.50), ONE_WEEK
      );
    });

    it("should check access correctly", async function () {
      const [permitted, compBps, fee, validUntil] =
        await prmission.checkAccess(1, agent.address);

      expect(permitted).to.be.true;
      expect(compBps).to.equal(200);
      expect(fee).to.equal(toUSDC(0.50));
    });

    it("should deny access to wrong agent", async function () {
      const [permitted] = await prmission.checkAccess(1, agent2.address);
      expect(permitted).to.be.false;
    });

    it("should deny access after expiration", async function () {
      await time.increase(ONE_WEEK + 1);
      const [permitted] = await prmission.checkAccess(1, agent.address);
      expect(permitted).to.be.false;
    });

    it("should preview settlement correctly", async function () {
      await prmission.connect(agent).depositEscrow(1, toUSDC(50));
      await prmission.connect(agent).reportOutcome(1, toUSDC(500), "booking", "test");

      const [userShare, protocolFee, agentRefund] =
        await prmission.previewSettlement(1);

      expect(userShare).to.equal(toUSDC(10));     // 2% of 500
      expect(protocolFee).to.equal(toUSDC(15));    // 3% of 500
      expect(agentRefund).to.equal(toUSDC(25));    // 50 - 10 - 15
    });

    it("should return user permissions list", async function () {
      await prmission.connect(user).grantPermission(
        agent.address, "purchase_history", "offers", 100, 0, ONE_WEEK
      );

      const perms = await prmission.getUserPermissions(user.address);
      expect(perms.length).to.equal(2);
    });
  });

  // ─── Protocol Fee Accounting ─────────────────────────────────────────────

  describe("Protocol Fee Tracking", function () {
    it("should track cumulative protocol fees", async function () {
      // Two full cycles
      await prmission.connect(user).grantPermission(
        agent.address, "data1", "purpose1", 200, 0, ONE_WEEK
      );
      await prmission.connect(user).grantPermission(
        agent.address, "data2", "purpose2", 100, 0, ONE_WEEK
      );

      // First: $500 outcome
      await prmission.connect(agent).depositEscrow(1, toUSDC(50));
      await prmission.connect(agent).reportOutcome(1, toUSDC(500), "booking", "flight");
      await time.increase(ONE_DAY + 1);
      await prmission.settle(1);

      // Second: $200 outcome
      await prmission.connect(agent).depositEscrow(2, toUSDC(20));
      await prmission.connect(agent).reportOutcome(2, toUSDC(200), "purchase", "hotel");
      await time.increase(ONE_DAY + 1);
      await prmission.settle(2);

      // Total fees: 3% of $500 + 3% of $200 = $15 + $6 = $21
      expect(await prmission.totalProtocolFees()).to.equal(toUSDC(21));
    });
  });
});
