"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrmissionRegistry = void 0;
const ethers_1 = require("ethers");
const REGISTRY_ABI = [
    "function registerAsCreator(string handle, string category, uint256 followerCount, uint256 engagementRateBps, uint256 floorPriceUSDC, uint256 referralBps, address referralAddress, string contentRules) external",
    "function listCreators(string category, uint256 maxFloorPrice) external view returns (address[])",
    "function getProfile(address wallet) external view returns (tuple(string handle, string category, uint256 followerCount, uint256 engagementRateBps, uint256 floorPriceUSDC, uint256 referralBps, address referralAddress, string contentRules, bool available, uint256 totalCampaigns, uint256 totalEarned))",
    "function recordCampaign(address wallet, uint256 amount) external",
    "function deactivate() external",
    "event CreatorRegistered(address indexed wallet, string handle, string category)",
    "event CampaignRecorded(address indexed wallet, uint256 amount)",
    "event CreatorDeactivated(address indexed wallet)"
];
class PrmissionRegistry {
    constructor(address, signerOrProvider) {
        this.contract = new ethers_1.ethers.Contract(address, REGISTRY_ABI, signerOrProvider);
    }
    async register(params) {
        const tx = await this.contract.registerAsCreator(params.handle, params.category, params.followerCount, params.engagementRateBps, params.floorPriceUSDC, params.referralBps, params.referralAddress, params.contentRules);
        return tx.wait();
    }
    async discover(category, maxFloorPriceUSDC) {
        return this.contract.listCreators(category, maxFloorPriceUSDC);
    }
    async getProfile(wallet) {
        const p = await this.contract.getProfile(wallet);
        return {
            handle: p.handle,
            category: p.category,
            followerCount: p.followerCount,
            engagementRateBps: p.engagementRateBps,
            floorPriceUSDC: p.floorPriceUSDC,
            referralBps: p.referralBps,
            referralAddress: p.referralAddress,
            contentRules: p.contentRules,
            available: p.available,
            totalCampaigns: p.totalCampaigns,
            totalEarned: p.totalEarned,
        };
    }
    async deactivate() {
        const tx = await this.contract.deactivate();
        return tx.wait();
    }
}
exports.PrmissionRegistry = PrmissionRegistry;
//# sourceMappingURL=registry.js.map