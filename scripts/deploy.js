const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Prmission Protocol...");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // ─── Configuration ───────────────────────────────────────────────────────
  //
  // Base Sepolia USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
  // Base Mainnet USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
  //
  // For testnet, you can also deploy a mock ERC-20 (see test/MockUSDC.sol)
  //
  const PAYMENT_TOKEN = process.env.PAYMENT_TOKEN_ADDRESS
    || "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC

  const TREASURY = process.env.TREASURY_ADDRESS
    || deployer.address; // default: deployer receives the 3%

  // ─── Deploy ──────────────────────────────────────────────────────────────

  console.log("\nPayment token:", PAYMENT_TOKEN);
  console.log("Treasury (receives 3%):", TREASURY);

  const Prmission = await ethers.getContractFactory("Prmission");
  const prmission = await Prmission.deploy(PAYMENT_TOKEN, TREASURY);
  await prmission.waitForDeployment();

  const address = await prmission.getAddress();
  console.log("\n✅ Prmission deployed to:", address);
  console.log("\nProtocol fee: 3% (300 bps)");
  console.log("Dispute window: 24 hours");
  console.log("Revocation grace: 60 seconds");

  // ─── Verify ──────────────────────────────────────────────────────────────

  console.log("\nTo verify on Basescan:");
  console.log(`npx hardhat verify --network base-sepolia ${address} "${PAYMENT_TOKEN}" "${TREASURY}"`);

  // ─── Save deployment info ────────────────────────────────────────────────

  const fs = require("fs");
  const deployment = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    contract: address,
    paymentToken: PAYMENT_TOKEN,
    treasury: TREASURY,
    protocolFeeBps: 300,
    disputeWindow: "24 hours",
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
  };

  fs.writeFileSync(
    "deployment.json",
    JSON.stringify(deployment, null, 2)
  );
  console.log("\nDeployment info saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
