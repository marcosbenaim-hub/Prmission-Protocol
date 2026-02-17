const NETWORKS = {
  base: {
    name: "Base Mainnet",
    chainId: 8453,
    rpcUrl: "https://mainnet.base.org",
    blockExplorer: "https://basescan.org",
    contracts: {
      prmissionV2: "0x0c8B16a57524f4009581B748356E01e1a969223d",
      usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    }
  },
  baseSepolia: {
    name: "Base Sepolia (Testnet)",
    chainId: 84532,
    rpcUrl: "https://sepolia.base.org",
    blockExplorer: "https://sepolia.basescan.org",
    contracts: {
      prmissionV2: null,
      usdc: null
    }
  }
};
const PROTOCOL = {
  FEE_BPS: 300,
  MAX_COMPENSATION_BPS: 5000,
  DISPUTE_WINDOW: 86400,
  REVOCATION_GRACE: 60,
  MAX_REVIEWERS: 50,
  USDC_DECIMALS: 6
};
const DEFAULT_NETWORK = "base";
module.exports = { NETWORKS, PROTOCOL, DEFAULT_NETWORK };
