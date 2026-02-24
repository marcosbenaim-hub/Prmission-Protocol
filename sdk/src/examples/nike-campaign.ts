/**
 * Nike AI Agent x Prmission Protocol
 * Full creator economy flow — end-to-end demo script
 *
 * Flow:
 * 1. Creator (@jordanfan92) registers on-chain media kit
 * 2. Nike AI agent discovers apparel creators under $1,000 floor
 * 3. Nike locks $1,000 USDC escrow for Instagram post campaign
 * 4. Campaign runs (480K impressions, 3.4K clicks, 92 conversions)
 * 5. Nike reports outcome on-chain
 * 6. After dispute window: atomic settlement to all 5 parties
 */

import { ethers } from "ethers";
import { PrmissionRegistry } from "../creator/registry";
import { PrmissionCampaigns } from "../creator/campaign";

// ─── Config ──────────────────────────────────────────────────────────────────
const REGISTRY_ADDRESS    = process.env.REGISTRY_ADDRESS    || "0x_REGISTRY";
const EXTENSION_ADDRESS   = process.env.EXTENSION_ADDRESS   || "0x_EXTENSION";
const USDC_ADDRESS        = process.env.USDC_ADDRESS        || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base mainnet USDC
const RPC_URL             = process.env.BASE_RPC_URL        || "https://mainnet.base.org";
const CREATOR_PRIVATE_KEY = process.env.CREATOR_PRIVATE_KEY || "";
const NIKE_PRIVATE_KEY    = process.env.NIKE_PRIVATE_KEY    || "";
const MANAGER_ADDRESS     = process.env.MANAGER_ADDRESS     || "0x_MANAGER";

const USDC = (dollars: number) => BigInt(Math.round(dollars * 1_000_000));

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const creatorSigner = new ethers.Wallet(CREATOR_PRIVATE_KEY, provider);
  const nikeSigner    = new ethers.Wallet(NIKE_PRIVATE_KEY, provider);

  console.log("\n🎨 === Prmission Creator Economy Demo ===\n");

  // ─── Step 1: Creator registers on-chain ─────────────────────────────────
  console.log("📋 Step 1: @jordanfan92 registers on-chain media kit...");
  const creatorRegistry = new PrmissionRegistry(REGISTRY_ADDRESS, creatorSigner);

  await creatorRegistry.register({
    handle:           "@jordanfan92",
    category:         "apparel",
    followerCount:    480_000,
    engagementRateBps: 342,           // 3.42%
    floorPriceUSDC:   USDC(500),      // $500 minimum
    referralBps:      500,            // 5% affiliate split
    referralAddress:  MANAGER_ADDRESS,
    contentRules:     "No competitor brands. Authentic content only. Must disclose #ad.",
  });
  console.log("✅ Creator registered\n");

  // ─── Step 2: Nike AI agent discovers creators ────────────────────────────
  console.log("🔍 Step 2: Nike AI agent discovering apparel creators under $1,000...");
  const nikeRegistry = new PrmissionRegistry(REGISTRY_ADDRESS, nikeSigner);
  const creators = await nikeRegistry.discover("apparel", USDC(1000));
  console.log(`✅ Found ${creators.length} creator(s): ${creators.join(", ")}\n`);

  // Get creator profile for campaign planning
  const profile = await nikeRegistry.getProfile(creatorSigner.address);
  console.log(`📊 Creator Profile:`);
  console.log(`   Handle: ${profile.handle}`);
  console.log(`   Followers: ${profile.followerCount.toLocaleString()}`);
  console.log(`   Engagement: ${Number(profile.engagementRateBps) / 100}%`);
  console.log(`   Floor: $${Number(profile.floorPriceUSDC) / 1_000_000}`);
  console.log(`   Past Campaigns: ${profile.totalCampaigns}\n`);

  // ─── Step 3: Nike locks escrow ───────────────────────────────────────────
  console.log("💰 Step 3: Nike AI agent locking $1,000 USDC escrow...");
  const nikeCampaigns = new PrmissionCampaigns(EXTENSION_ADDRESS, nikeSigner);

  const { campaignId, receipt: createReceipt } = await nikeCampaigns.createCampaign({
    creator:       creatorSigner.address,
    category:      "apparel",
    contentType:   "instagram_post",
    escrowAmount:  USDC(1000),
    creatorBps:    7000,   // 70% to creator
    managerBps:    1000,   // 10% to manager
    manager:       MANAGER_ADDRESS,
    usdcAddress:   USDC_ADDRESS,
  });
  console.log(`✅ Campaign #${campaignId} created | tx: ${createReceipt.hash}\n`);

  // Preview settlement math before campaign runs
  const preview = await nikeCampaigns.previewSettlement(campaignId);
  console.log(`📐 Settlement Preview for $1,000 escrow:`);
  console.log(`   Creator (70%):  $${Number(preview.creatorShare) / 1_000_000}`);
  console.log(`   Manager (10%):  $${Number(preview.managerShare) / 1_000_000}`);
  console.log(`   Affiliate (5%): $${Number(preview.referralShare) / 1_000_000}`);
  console.log(`   Protocol (3%):  $${Number(preview.protocolFee) / 1_000_000}`);
  console.log(`   Nike Refund:    $${Number(preview.brandRefund) / 1_000_000}\n`);

  // ─── Step 4: Campaign runs, Nike reports outcome ─────────────────────────
  console.log("📣 Step 4: Campaign runs. Nike AI agent reporting outcome...");
  const outcomeMetadata = JSON.stringify({
    impressions: 480_000,
    clicks: 3_400,
    conversions: 92,
    revenue: 18_400,
    ctr: "0.71%",
    conversionRate: "2.71%",
  });

  await nikeCampaigns.reportOutcome(campaignId, USDC(1000), outcomeMetadata);
  console.log(`✅ Outcome reported: 480K impressions, 3.4K clicks, 92 conversions\n`);

  // ─── Step 5: Settle after dispute window (24hr in prod, skip in demo) ────
  console.log("⚡ Step 5: Settling campaign atomically...");
  console.log("   (In production, 24hr dispute window must pass first)");
  const { hash } = await nikeCampaigns.settle(campaignId);
  console.log(`✅ Settled! tx: ${hash}\n`);

  // Final state
  const campaign = await nikeCampaigns.getCampaign(campaignId);
  const updatedProfile = await nikeRegistry.getProfile(creatorSigner.address);

  console.log("🎉 === Final State ===");
  console.log(`   Campaign Status: ${["ACTIVE","OUTCOME_REPORTED","SETTLED","DISPUTED","REFUNDED"][campaign.status]}`);
  console.log(`   Creator Total Earned: $${Number(updatedProfile.totalEarned) / 1_000_000}`);
  console.log(`   Creator Total Campaigns: ${updatedProfile.totalCampaigns}`);
  console.log("\n✅ Prmission Creator Economy flow complete.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
