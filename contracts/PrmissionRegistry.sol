// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title PrmissionRegistry
 * @notice On-chain creator discovery layer for the Prmission Creator Economy.
 *         Creators register their profile. Brands (AI agents) query by category + price.
 */
contract PrmissionRegistry {

    // ─── Structs ─────────────────────────────────────────────────────────

    struct CreatorProfile {
        address wallet;
        string  handle;              // e.g. "@marcos"
        string  category;            // e.g. "apparel", "fitness", "tech"
        uint256 followerCount;
        uint256 engagementRateBps;   // e.g. 420 = 4.20%
        uint256 floorPriceUSDC;      // minimum escrow in USDC (6 decimals)
        uint256 referralBps;         // affiliate cut e.g. 500 = 5%
        address referralAddress;     // who gets the affiliate cut
        string  contentRules;        // e.g. "no alcohol, no competitors"
        bool    available;
        uint256 registeredAt;
        uint256 totalCampaigns;
        uint256 totalEarned;         // cumulative USDC earned
    }

    // ─── Storage ─────────────────────────────────────────────────────────

    mapping(address => CreatorProfile) public profiles;
    address[] public creatorList;

    // ─── Events ──────────────────────────────────────────────────────────

    event CreatorRegistered(
        address indexed wallet,
        string handle,
        string category,
        uint256 floorPriceUSDC
    );
    event CreatorUpdated(address indexed wallet);
    event CreatorDeactivated(address indexed wallet);
    event CampaignRecorded(address indexed wallet, uint256 amount);

    // ─── Register ────────────────────────────────────────────────────────

    function registerAsCreator(
        string calldata handle,
        string calldata category,
        uint256 followerCount,
        uint256 engagementRateBps,
        uint256 floorPriceUSDC,
        uint256 referralBps,
        address referralAddress,
        string calldata contentRules
    ) external {
        require(bytes(handle).length > 0, "Handle required");
        require(bytes(category).length > 0, "Category required");
        require(floorPriceUSDC > 0, "Floor price required");
        require(referralBps <= 2000, "Referral max 20%");

        bool isNew = profiles[msg.sender].wallet == address(0);

        profiles[msg.sender] = CreatorProfile({
            wallet: msg.sender,
            handle: handle,
            category: category,
            followerCount: followerCount,
            engagementRateBps: engagementRateBps,
            floorPriceUSDC: floorPriceUSDC,
            referralBps: referralBps,
            referralAddress: referralAddress,
            contentRules: contentRules,
            available: true,
            registeredAt: block.timestamp,
            totalCampaigns: 0,
            totalEarned: 0
        });

        if (isNew) creatorList.push(msg.sender);

        emit CreatorRegistered(msg.sender, handle, category, floorPriceUSDC);
    }

    // ─── Discovery ───────────────────────────────────────────────────────

    function listCreators(
        string calldata category,
        uint256 maxFloorPrice
    ) external view returns (address[] memory results) {
        uint256 count = 0;
        for (uint256 i = 0; i < creatorList.length; i++) {
            CreatorProfile storage p = profiles[creatorList[i]];
            if (
                p.available &&
                _matchCategory(p.category, category) &&
                p.floorPriceUSDC <= maxFloorPrice
            ) count++;
        }

        results = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < creatorList.length; i++) {
            CreatorProfile storage p = profiles[creatorList[i]];
            if (
                p.available &&
                _matchCategory(p.category, category) &&
                p.floorPriceUSDC <= maxFloorPrice
            ) results[idx++] = creatorList[i];
        }
    }

    function getProfile(address wallet) external view returns (CreatorProfile memory) {
        return profiles[wallet];
    }

    function getTotalCreators() external view returns (uint256) {
        return creatorList.length;
    }

    // ─── Record Campaign (called by CreatorExtension) ─────────────────────

    function recordCampaign(address wallet, uint256 amount) external {
        require(profiles[wallet].wallet != address(0), "Creator not registered");
        profiles[wallet].totalCampaigns++;
        profiles[wallet].totalEarned += amount;
        emit CampaignRecorded(wallet, amount);
    }

    // ─── Deactivate ──────────────────────────────────────────────────────

    function deactivate() external {
        profiles[msg.sender].available = false;
        emit CreatorDeactivated(msg.sender);
    }

    // ─── Internal ────────────────────────────────────────────────────────

    function _matchCategory(
        string memory a,
        string memory b
    ) internal pure returns (bool) {
        if (bytes(b).length == 0) return true; // empty = match all
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}
