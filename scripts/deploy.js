const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const PAYMENT_TOKEN = process.env.PAYMENT_TOKEN_ADDRESS
    || "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // USDC on Base Sepolia
  const TREASURY = process.env.TREASURY_ADDRESS || deployer.address;
  const IDENTITY_REGISTRY = process.env.IDENTITY_REGISTRY_ADDRESS || "";
  const REPUTATION_REGISTRY = process.env.REPUTATION_REGISTRY_ADDRESS || "";

  const Prmission = await hre.ethers.getContractFactory("Prmission");
  const prmission = await Prmission.deploy(PAYMENT_TOKEN, TREASURY);
  await prmission.waitForDeployment();

  const addr = await prmission.getAddress();
  console.log("Prmission deployed to:", addr);
  console.log("Treasury:", TREASURY);

  if (IDENTITY_REGISTRY) {
    await prmission.setIdentityRegistry(IDENTITY_REGISTRY);
    console.log("Identity Registry set:", IDENTITY_REGISTRY);
  }

  if (REPUTATION_REGISTRY) {
    await prmission.setReputationRegistry(REPUTATION_REGISTRY);
    console.log("Reputation Registry set:", REPUTATION_REGISTRY);
  }

  const fs = require("fs");
  fs.writeFileSync("deployment.json", JSON.stringify({
    network: hre.network.name,
    prmission: addr,
    paymentToken: PAYMENT_TOKEN,
    treasury: TREASURY,
    identityRegistry: IDENTITY_REGISTRY || "not set",
    reputationRegistry: REPUTATION_REGISTRY || "not set",
    deployedAt: new Date().toISOString(),
    deployer: deployer.address
  }, null, 2));
  console.log("Saved to deployment.json");
}

main().catch((err) => { console.error(err); process.exit(1); });
