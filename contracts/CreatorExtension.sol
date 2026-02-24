// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PrmissionRegistry.sol";

/**
 * @title CreatorExtension
 * @notice Creator Economy layer for Prmission Protocol.
 *         Nike's AI agent deposits escrow, campaign runs, settlement
 *         splits atomically: Creator + Manager + Affiliate + Protocol.
 */
contract CreatorExtension is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ─── Constants ───────────────────────────────────────────────────────

    uint256 public constant PROTOCOL_FEE_BPS = 300;   // 3%
    uint256 public constant BPS_DENOMINATOR  = 10_000;

    // ─── Immutables ──────────────────────────────────────────────────────

    IERC20              public immutable usdc;
    PrmissionRegistry   public immutable registry;
    address             public treasury;

    // ─── Enums ───────────────────────────────────────────────────────────

    enum CampaignStatus { ACTIVE, OUTCOME_REPORTED, DISPUTED, SETTLED, REFUNDED }

    // ─── Structs ─────────────────────────────────────────────────────────

    struct Campaign {
        uint256  id;
        address  brand;              // Nike's agent wallet
        address  creator;            // Influencer wallet
        string   contentCategory;   // "apparel", "footwear" etc
        string   contentType;        // "instagram_post", "reel", "story"
        uint256  escrowAmount;       // Total USDC locked
        uint256  creatorBps;         // Creator's cut
        uint256  managerBps;         // Manager's cut
        address  managerAddress;     // Manager wallet
        uint256  referralBps;        // Affiliate cut (from registry)
        address  referralAddress;    // Affiliate wallet (from registry)
        uint256  outcomeValue;       // Reported impressions/conversions value
        string   outcomeDescription; // "480K impressions, 3.4K clicks, 92 conversions"
        uint256  reportedAt;
        uint256  disputeWindowEnd;
        CampaignStatus status;
        uint256  createdAt;
    }

    // ─── Storage ─────────────────────────────────────────────────────────

    uint256 public nextCampaignId = 1;
    mapping(uint256 => Campaign) public campaigns;
    mapping(address => uint256[]) public brandCampaigns;
    mapping(address => uint256[]) public creatorCampaigns;

    uint256 public totalVolume;
    uint256 public totalProtocolFees;

    // ─── Events ──────────────────────────────────────────────────────────

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed brand,
        address indexed creator,
        uint256 escrowAmount,
        string contentCategory
    );
    event OutcomeReported(
        uint256 indexed campaignId,
        uint256 outcomeValue,
        string outcomeDescription,
        uint256 disputeWindowEnd
    );
    event CampaignSettled(
        uint256 indexed campaignId,
        uint256 creatorShare,
        uint256 managerShare,
        uint256 referralShare,
        uint256 protocolFee,
        uint256 brandRefund
    );
    event CampaignDisputed(uint256 indexed campaignId, address indexed disputant);
    event CampaignRefunded(uint256 indexed campaignId, uint256 amount);

    // ─── Constructor ─────────────────────────────────────────────────────

    constructor(address _usdc, address _registry, address _treasury) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC");
        require(_registry != address(0), "Invalid registry");
        require(_treasury != address(0), "Invalid treasury");
        usdc = IERC20(_usdc);
        registry = PrmissionRegistry(_registry);
        treasury = _treasury;
    }

    // ─── Brand (Nike) initiates campaign ─────────────────────────────────

    /**
     * @notice Nike's AI agent locks USDC and requests a creator campaign.
     * @param creator          Creator wallet address (found via registry)
     * @param contentCategory  e.g. "apparel"
     * @param contentType      e.g. "instagram_post"
     * @param escrowAmount     Total USDC to lock
     * @param creatorBps       Creator's share e.g. 7000 = 70%
     * @param managerBps       Manager's share e.g. 1000 = 10%
     * @param managerAddress   Manager wallet (address(0) if none)
     */
    function createCampaign(
        address creator,
        string calldata contentCategory,
        string calldata contentType,
        uint256 escrowAmount,
        uint256 creatorBps,
        uint256 managerBps,
        address managerAddress
    ) external nonReentrant returns (uint256 campaignId) {
        PrmissionRegistry.CreatorProfile memory profile = registry.getProfile(creator);

        require(profile.wallet != address(0), "Creator not registered");
        require(profile.available, "Creator not available");
        require(escrowAmount >= profile.floorPriceUSDC, "Below creator floor price");

        // Validate BPS — all cuts + protocol fee cannot exceed 100%
        uint256 totalBps = creatorBps + managerBps + profile.referralBps + PROTOCOL_FEE_BPS;
        require(totalBps <= BPS_DENOMINATOR, "Splits exceed 100%");

        // Lock escrow from Nike's wallet
        usdc.safeTransferFrom(msg.sender, address(this), escrowAmount);

        campaignId = nextCampaignId++;

        campaigns[campaignId] = Campaign({
            id: campaignId,
            brand: msg.sender,
            creator: creator,
            contentCategory: contentCategory,
            contentType: contentType,
            escrowAmount: escrowAmount,
            creatorBps: creatorBps,
            managerBps: managerBps,
            managerAddress: managerAddress,
            referralBps: profile.referralBps,
            referralAddress: profile.referralAddress,
            outcomeValue: 0,
            outcomeDescription: "",
            reportedAt: 0,
            disputeWindowEnd: 0,
            status: CampaignStatus.ACTIVE,
            createdAt: block.timestamp
        });

        brandCampaigns[msg.sender].push(campaignId);
        creatorCampaigns[creator].push(campaignId);

        emit CampaignCreated(campaignId, msg.sender, creator, escrowAmount, contentCategory);
    }

    // ─── Brand reports campaign outcome ──────────────────────────────────

    /**
     * @notice Nike reports: "480K impressions, 3,400 clicks, 92 conversions"
     */
    function reportOutcome(
        uint256 campaignId,
        uint256 outcomeValue,
        string calldata outcomeDescription
    ) external {
        Campaign storage c = campaigns[campaignId];
        require(msg.sender == c.brand, "Only brand can report");
        require(c.status == CampaignStatus.ACTIVE, "Campaign not active");

        c.outcomeValue = outcomeValue;
        c.outcomeDescription = outcomeDescription;
        c.reportedAt = block.timestamp;
        c.disputeWindowEnd = block.timestamp + 24 hours;
        c.status = CampaignStatus.OUTCOME_REPORTED;

        emit OutcomeReported(campaignId, outcomeValue, outcomeDescription, c.disputeWindowEnd);
    }

    // ─── Settle — atomic split to all parties ────────────────────────────

    /**
     * @notice After 24hr dispute window, anyone can trigger settlement.
     *         Splits atomically:
     *         Creator share → creator wallet
     *         Manager share → manager wallet
     *         Affiliate share → referral wallet (from registry)
     *         Protocol fee → treasury (3%)
     *         Remainder → brand refund
     */
    function settle(uint256 campaignId) external nonReentrant {
        Campaign storage c = campaigns[campaignId];
        require(c.status == CampaignStatus.OUTCOME_REPORTED, "Not ready to settle");
        require(block.timestamp >= c.disputeWindowEnd, "Dispute window still open");
        require(
            msg.sender == c.brand ||
            msg.sender == c.creator ||
            msg.sender == owner(),
            "Not authorized"
        );

        uint256 amount = c.escrowAmount;

        uint256 creatorShare  = (amount * c.creatorBps)  / BPS_DENOMINATOR;
        uint256 managerShare  = (amount * c.managerBps)  / BPS_DENOMINATOR;
        uint256 referralShare = (amount * c.referralBps) / BPS_DENOMINATOR;
        uint256 protocolFee   = (amount * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 brandRefund   = amount - creatorShare - managerShare - referralShare - protocolFee;

        c.status = CampaignStatus.SETTLED;
        totalVolume       += amount;
        totalProtocolFees += protocolFee;

        // Record on-chain history in registry
        registry.recordCampaign(c.creator, creatorShare);

        // Atomic multi-party distribution
        if (creatorShare > 0)  usdc.safeTransfer(c.creator, creatorShare);
        if (managerShare > 0 && c.managerAddress != address(0))
                               usdc.safeTransfer(c.managerAddress, managerShare);
        if (referralShare > 0 && c.referralAddress != address(0))
                               usdc.safeTransfer(c.referralAddress, referralShare);
        if (protocolFee > 0)   usdc.safeTransfer(treasury, protocolFee);
        if (brandRefund > 0)   usdc.safeTransfer(c.brand, brandRefund);

        emit CampaignSettled(
            campaignId, creatorShare, managerShare,
            referralShare, protocolFee, brandRefund
        );
    }

    // ─── Dispute ─────────────────────────────────────────────────────────

    function dispute(uint256 campaignId) external {
        Campaign storage c = campaigns[campaignId];
        require(c.status == CampaignStatus.OUTCOME_REPORTED, "Cannot dispute");
        require(block.timestamp < c.disputeWindowEnd, "Dispute window closed");
        require(msg.sender == c.brand || msg.sender == c.creator, "Not a party");

        c.status = CampaignStatus.DISPUTED;
        emit CampaignDisputed(campaignId, msg.sender);
    }

    // ─── Views ───────────────────────────────────────────────────────────

    function getCampaign(uint256 campaignId) external view returns (Campaign memory) {
        return campaigns[campaignId];
    }

    function previewSettlement(uint256 campaignId) external view returns (
        uint256 creatorShare,
        uint256 managerShare,
        uint256 referralShare,
        uint256 protocolFee,
        uint256 brandRefund
    ) {
        Campaign storage c = campaigns[campaignId];
        uint256 amount = c.escrowAmount;
        creatorShare  = (amount * c.creatorBps)      / BPS_DENOMINATOR;
        managerShare  = (amount * c.managerBps)      / BPS_DENOMINATOR;
        referralShare = (amount * c.referralBps)     / BPS_DENOMINATOR;
        protocolFee   = (amount * PROTOCOL_FEE_BPS)  / BPS_DENOMINATOR;
        brandRefund   = amount - creatorShare - managerShare - referralShare - protocolFee;
    }

    function getBrandCampaigns(address brand) external view returns (uint256[] memory) {
        return brandCampaigns[brand];
    }

    function getCreatorCampaigns(address creator) external view returns (uint256[] memory) {
        return creatorCampaigns[creator];
    }

    // ─── Admin ───────────────────────────────────────────────────────────

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid");
        treasury = _treasury;
    }
}
