const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Creator Economy — Nike x Prmission", function () {
  let registry, extension, usdc;
  let owner, nike, creator, manager, affiliate, treasury;

  const FLOOR_PRICE  = ethers.parseUnits("5000", 6);  // $5,000 USDC
  const ESCROW       = ethers.parseUnits("8000", 6);  // $8,000 USDC
  const CREATOR_BPS  = 7000;  // 70%
  const MANAGER_BPS  = 1000;  // 10%
  const REFERRAL_BPS = 500;   // 5%
  const PROTOCOL_BPS = 300;   // 3%
  // Brand refund    = 11.5%  = remainder

  beforeEach(async function () {
    [owner, nike, creator, manager, affiliate, treasury] = await ethers.getSigners();

    // Deploy mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USD Coin", "USDC", 6);

    // Mint USDC to Nike
    await usdc.mint(nike.address, ethers.parseUnits("100000", 6));

    // Deploy Registry
    const Registry = await ethers.getContractFactory("PrmissionRegistry");
    registry = await Registry.deploy();

    // Deploy CreatorExtension
    const Extension = await ethers.getContractFactory("CreatorExtension");
    extension = await Extension.deploy(
      await usdc.getAddress(),
      await registry.getAddress(),
      treasury.address
    );

    // Creator registers on-chain media kit
    await registry.connect(creator).registerAsCreator(
      "@nikeinfluencer",
      "apparel",
      500000,       // 500K followers
      420,          // 4.20% engagement
      FLOOR_PRICE,
      REFERRAL_BPS,
      affiliate.address,
      "no alcohol, no competitors"
    );

    // Nike approves USDC spend
    await usdc.connect(nike).approve(await extension.getAddress(), ethers.MaxUint256);
  });

  describe("Registry", function () {
    it("should register creator with correct profile", async function () {
      const profile = await registry.getProfile(creator.address);
      expect(profile.handle).to.equal("@nikeinfluencer");
      expect(profile.category).to.equal("apparel");
      expect(profile.followerCount).to.equal(500000);
      expect(profile.floorPriceUSDC).to.equal(FLOOR_PRICE);
      expect(profile.referralBps).to.equal(REFERRAL_BPS);
      expect(profile.referralAddress).to.equal(affiliate.address);
      expect(profile.available).to.be.true;
    });

    it("should discover creator via listCreators", async function () {
      const results = await registry.listCreators("apparel", ESCROW);
      expect(results).to.include(creator.address);
    });

    it("should not return creator if floor price too high", async function () {
      const lowBudget = ethers.parseUnits("1000", 6);
      const results = await registry.listCreators("apparel", lowBudget);
      expect(results).to.not.include(creator.address);
    });

    it("should not return creator in wrong category", async function () {
      const results = await registry.listCreators("pharma", ESCROW);
      expect(results).to.not.include(creator.address);
    });
  });

  describe("Nike Campaign Flow", function () {
    it("should create campaign and lock escrow", async function () {
      const nikeBefore = await usdc.balanceOf(nike.address);

      await extension.connect(nike).createCampaign(
        creator.address,
        "apparel",
        "instagram_post",
        ESCROW,
        CREATOR_BPS,
        MANAGER_BPS,
        manager.address
      );

      const nikeAfter = await usdc.balanceOf(nike.address);
      expect(nikeBefore - nikeAfter).to.equal(ESCROW);

      const campaign = await extension.getCampaign(1);
      expect(campaign.brand).to.equal(nike.address);
      expect(campaign.creator).to.equal(creator.address);
      expect(campaign.escrowAmount).to.equal(ESCROW);
    });

    it("should reject campaign below creator floor price", async function () {
      const tooLow = ethers.parseUnits("1000", 6);
      await expect(
        extension.connect(nike).createCampaign(
          creator.address, "apparel", "instagram_post",
          tooLow, CREATOR_BPS, MANAGER_BPS, manager.address
        )
      ).to.be.revertedWith("Below creator floor price");
    });

    it("should report outcome after campaign runs", async function () {
      await extension.connect(nike).createCampaign(
        creator.address, "apparel", "instagram_post",
        ESCROW, CREATOR_BPS, MANAGER_BPS, manager.address
      );

      await extension.connect(nike).reportOutcome(
        1,
        480000,
        "480K impressions, 3,400 clicks, 92 conversions"
      );

      const campaign = await extension.getCampaign(1);
      expect(campaign.status).to.equal(1); // OUTCOME_REPORTED
      expect(campaign.outcomeDescription).to.equal(
        "480K impressions, 3,400 clicks, 92 conversions"
      );
    });
  });

  describe("Atomic Settlement — Nike Shoe Launch", function () {
    beforeEach(async function () {
      // Nike creates campaign
      await extension.connect(nike).createCampaign(
        creator.address, "apparel", "instagram_post",
        ESCROW, CREATOR_BPS, MANAGER_BPS, manager.address
      );
      // Nike reports outcome
      await extension.connect(nike).reportOutcome(
        1, 480000, "480K impressions, 3,400 clicks, 92 conversions"
      );
      // Fast forward past 24hr dispute window
      await time.increase(24 * 60 * 60 + 1);
    });

    it("should settle with correct splits to all parties", async function () {
      const creatorBefore   = await usdc.balanceOf(creator.address);
      const managerBefore   = await usdc.balanceOf(manager.address);
      const affiliateBefore = await usdc.balanceOf(affiliate.address);
      const treasuryBefore  = await usdc.balanceOf(treasury.address);
      const nikeBefore      = await usdc.balanceOf(nike.address);

      await extension.connect(nike).settle(1);

      const creatorShare   = (ESCROW * BigInt(CREATOR_BPS))  / 10000n;
      const managerShare   = (ESCROW * BigInt(MANAGER_BPS))  / 10000n;
      const referralShare  = (ESCROW * BigInt(REFERRAL_BPS)) / 10000n;
      const protocolFee    = (ESCROW * BigInt(PROTOCOL_BPS)) / 10000n;
      const brandRefund    = ESCROW - creatorShare - managerShare - referralShare - protocolFee;

      expect(await usdc.balanceOf(creator.address)   - creatorBefore).to.equal(creatorShare);
      expect(await usdc.balanceOf(manager.address)   - managerBefore).to.equal(managerShare);
      expect(await usdc.balanceOf(affiliate.address) - affiliateBefore).to.equal(referralShare);
      expect(await usdc.balanceOf(treasury.address)  - treasuryBefore).to.equal(protocolFee);
      expect(await usdc.balanceOf(nike.address)      - nikeBefore).to.equal(brandRefund);
    });

    it("should update creator on-chain history after settlement", async function () {
      await extension.connect(nike).settle(1);
      const profile = await registry.getProfile(creator.address);
      expect(profile.totalCampaigns).to.equal(1);
      expect(profile.totalEarned).to.be.gt(0);
    });

    it("should emit CampaignSettled event with correct amounts", async function () {
      const creatorShare  = (ESCROW * BigInt(CREATOR_BPS))  / 10000n;
      const managerShare  = (ESCROW * BigInt(MANAGER_BPS))  / 10000n;
      const referralShare = (ESCROW * BigInt(REFERRAL_BPS)) / 10000n;
      const protocolFee   = (ESCROW * BigInt(PROTOCOL_BPS)) / 10000n;
      const brandRefund   = ESCROW - creatorShare - managerShare - referralShare - protocolFee;

      await expect(extension.connect(nike).settle(1))
        .to.emit(extension, "CampaignSettled")
        .withArgs(1, creatorShare, managerShare, referralShare, protocolFee, brandRefund);
    });
  });

  describe("Dispute", function () {
    it("should allow creator to dispute within window", async function () {
      await extension.connect(nike).createCampaign(
        creator.address, "apparel", "instagram_post",
        ESCROW, CREATOR_BPS, MANAGER_BPS, manager.address
      );
      await extension.connect(nike).reportOutcome(1, 100, "Low effort report");

      await expect(extension.connect(creator).dispute(1))
        .to.emit(extension, "CampaignDisputed")
        .withArgs(1, creator.address);
    });

    it("should reject dispute after window closes", async function () {
      await extension.connect(nike).createCampaign(
        creator.address, "apparel", "instagram_post",
        ESCROW, CREATOR_BPS, MANAGER_BPS, manager.address
      );
      await extension.connect(nike).reportOutcome(1, 100, "report");
      await time.increase(24 * 60 * 60 + 1);

      await expect(
        extension.connect(creator).dispute(1)
      ).to.be.revertedWith("Dispute window closed");
    });
  });

  describe("Preview Settlement", function () {
    it("should preview correct settlement math before settling", async function () {
      await extension.connect(nike).createCampaign(
        creator.address, "apparel", "instagram_post",
        ESCROW, CREATOR_BPS, MANAGER_BPS, manager.address
      );

      const preview = await extension.previewSettlement(1);
      expect(preview.creatorShare).to.equal((ESCROW * BigInt(CREATOR_BPS)) / 10000n);
      expect(preview.managerShare).to.equal((ESCROW * BigInt(MANAGER_BPS)) / 10000n);
      expect(preview.referralShare).to.equal((ESCROW * BigInt(REFERRAL_BPS)) / 10000n);
      expect(preview.protocolFee).to.equal((ESCROW * BigInt(PROTOCOL_BPS)) / 10000n);
    });
  });
});
