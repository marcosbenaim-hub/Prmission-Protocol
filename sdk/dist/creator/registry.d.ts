import { ethers } from "ethers";
export interface CreatorProfile {
    handle: string;
    category: string;
    followerCount: bigint;
    engagementRateBps: bigint;
    floorPriceUSDC: bigint;
    referralBps: bigint;
    referralAddress: string;
    contentRules: string;
    available: boolean;
    totalCampaigns: bigint;
    totalEarned: bigint;
}
export interface RegisterParams {
    handle: string;
    category: string;
    followerCount: number;
    engagementRateBps: number;
    floorPriceUSDC: bigint;
    referralBps: number;
    referralAddress: string;
    contentRules: string;
}
export declare class PrmissionRegistry {
    private contract;
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.Provider);
    register(params: RegisterParams): Promise<ethers.TransactionReceipt>;
    discover(category: string, maxFloorPriceUSDC: bigint): Promise<string[]>;
    getProfile(wallet: string): Promise<CreatorProfile>;
    deactivate(): Promise<ethers.TransactionReceipt>;
}
//# sourceMappingURL=registry.d.ts.map