import { ethers } from "ethers";
export declare enum CampaignStatus {
    ACTIVE = 0,
    OUTCOME_REPORTED = 1,
    SETTLED = 2,
    DISPUTED = 3,
    REFUNDED = 4
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
    escrowAmount: bigint;
    creatorBps: number;
    managerBps: number;
    manager: string;
    usdcAddress: string;
}
export declare class PrmissionCampaigns {
    private contract;
    private signer;
    constructor(extensionAddress: string, signer: ethers.Signer);
    createCampaign(params: CreateCampaignParams): Promise<{
        campaignId: bigint;
        receipt: ethers.TransactionReceipt;
    }>;
    reportOutcome(campaignId: bigint, outcomeValue: bigint, metadata: string): Promise<ethers.TransactionReceipt>;
    settle(campaignId: bigint): Promise<ethers.TransactionReceipt>;
    dispute(campaignId: bigint): Promise<ethers.TransactionReceipt>;
    previewSettlement(campaignId: bigint): Promise<SettlementPreview>;
    getCampaign(campaignId: bigint): Promise<Campaign>;
    getBrandCampaigns(brand: string): Promise<bigint[]>;
    getCreatorCampaigns(creator: string): Promise<bigint[]>;
}
//# sourceMappingURL=campaign.d.ts.map