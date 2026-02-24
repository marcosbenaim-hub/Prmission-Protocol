"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrmissionCampaigns = exports.CampaignStatus = void 0;
const ethers_1 = require("ethers");
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
var CampaignStatus;
(function (CampaignStatus) {
    CampaignStatus[CampaignStatus["ACTIVE"] = 0] = "ACTIVE";
    CampaignStatus[CampaignStatus["OUTCOME_REPORTED"] = 1] = "OUTCOME_REPORTED";
    CampaignStatus[CampaignStatus["SETTLED"] = 2] = "SETTLED";
    CampaignStatus[CampaignStatus["DISPUTED"] = 3] = "DISPUTED";
    CampaignStatus[CampaignStatus["REFUNDED"] = 4] = "REFUNDED";
})(CampaignStatus || (exports.CampaignStatus = CampaignStatus = {}));
class PrmissionCampaigns {
    constructor(extensionAddress, signer) {
        this.contract = new ethers_1.ethers.Contract(extensionAddress, EXTENSION_ABI, signer);
        this.signer = signer;
    }
    async createCampaign(params) {
        // Approve USDC spend first
        const usdc = new ethers_1.ethers.Contract(params.usdcAddress, ERC20_ABI, this.signer);
        const signerAddress = await this.signer.getAddress();
        const contractAddress = await this.contract.getAddress();
        const allowance = await usdc.allowance(signerAddress, contractAddress);
        if (allowance < params.escrowAmount) {
            const approveTx = await usdc.approve(contractAddress, params.escrowAmount);
            await approveTx.wait();
        }
        const tx = await this.contract.createCampaign(params.creator, params.category, params.contentType, params.escrowAmount, params.creatorBps, params.managerBps, params.manager);
        const receipt = await tx.wait();
        // Parse campaignId from CampaignCreated event
        const iface = new ethers_1.ethers.Interface(EXTENSION_ABI);
        let campaignId = 0n;
        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === "CampaignCreated") {
                    campaignId = parsed.args.campaignId;
                }
            }
            catch { }
        }
        return { campaignId, receipt };
    }
    async reportOutcome(campaignId, outcomeValue, metadata) {
        const tx = await this.contract.reportOutcome(campaignId, outcomeValue, metadata);
        return tx.wait();
    }
    async settle(campaignId) {
        const tx = await this.contract.settle(campaignId);
        return tx.wait();
    }
    async dispute(campaignId) {
        const tx = await this.contract.dispute(campaignId);
        return tx.wait();
    }
    async previewSettlement(campaignId) {
        const r = await this.contract.previewSettlement(campaignId);
        return {
            creatorShare: r.creatorShare,
            managerShare: r.managerShare,
            referralShare: r.referralShare,
            protocolFee: r.protocolFee,
            brandRefund: r.brandRefund,
        };
    }
    async getCampaign(campaignId) {
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
    async getBrandCampaigns(brand) {
        return this.contract.getBrandCampaigns(brand);
    }
    async getCreatorCampaigns(creator) {
        return this.contract.getCreatorCampaigns(creator);
    }
}
exports.PrmissionCampaigns = PrmissionCampaigns;
//# sourceMappingURL=campaign.js.map