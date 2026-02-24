import { ethers } from "ethers";

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
  engagementRateBps: number;   // e.g. 342 = 3.42%
  floorPriceUSDC: bigint;      // 6 decimals, e.g. 500_000_000n = $500
  referralBps: number;         // e.g. 500 = 5%
  referralAddress: string;
  contentRules: string;
}

export class PrmissionRegistry {
  private contract: ethers.Contract;

  constructor(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
    this.contract = new ethers.Contract(address, REGISTRY_ABI, signerOrProvider);
  }

  async register(params: RegisterParams): Promise<ethers.TransactionReceipt> {
    const tx = await this.contract.registerAsCreator(
      params.handle,
      params.category,
      params.followerCount,
      params.engagementRateBps,
      params.floorPriceUSDC,
      params.referralBps,
      params.referralAddress,
      params.contentRules
    );
    return tx.wait();
  }

  async discover(category: string, maxFloorPriceUSDC: bigint): Promise<string[]> {
    return this.contract.listCreators(category, maxFloorPriceUSDC);
  }

  async getProfile(wallet: string): Promise<CreatorProfile> {
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

  async deactivate(): Promise<ethers.TransactionReceipt> {
    const tx = await this.contract.deactivate();
    return tx.wait();
  }
}
