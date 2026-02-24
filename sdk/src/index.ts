// Creator Economy
export { PrmissionRegistry } from "./creator/registry";
export type { CreatorProfile, RegisterParams } from "./creator/registry";

export { PrmissionCampaigns, CampaignStatus } from "./creator/campaign";
export type { Campaign, SettlementPreview, CreateCampaignParams } from "./creator/campaign";

// Constants
export const ADDRESSES = {
  BASE_MAINNET: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
} as const;
