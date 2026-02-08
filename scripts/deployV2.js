require("dotenv/config");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) throw new Error("No deployer signer found. Check DEPLOYER_PRIVATE_KEY in .env");
  console.log("Deploying PrmissionV2 with:", deployer.address);
  console.log("Network:", hre.network.name);

  const PAYMENT_TOKEN = process.env.PAYMENT_TOKEN_ADDRESS;
  const TREASURY = process.env.TREASURY_ADDRESS;

  if (!PAYMENT_TOKEN || !TREASURY) {
    throw new Error("Set PAYMENT_TOKEN_ADDRESS and TREASURY_ADDRESS in .env");
  }

  console.log("Payment Token (USDC):", PAYMENT_TOKEN);
  console.log("Treasury:", TREASURY);

  const PrmissionV2 = await hre.ethers.getContractFactory("PrmissionV2");
  const prmission = await PrmissionV2.deploy(PAYMENT_TOKEN, TREASURY);
  await prmission.waitForDeployment();

  const addr = await prmission.getAddress();
  console.log("\nPrmissionV2 deployed to:", addr);

  const fs = require("fs");
  const filename = "deployment-v2-" + hre.network.name + ".json";
  fs.writeFileSync(filename, JSON.stringify({
    contract: "PrmissionV2",
    network: hre.network.name,
    address: addr,
    paymentToken: PAYMENT_TOKEN,
    treasury: TREASURY,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    v1Address: "0xb9A5F35a8EB45aD45b91dD83ed5b91986537B193"
  }, null, 2));
  console.log("Saved to", filename);
}

main().catch((err) => { console.error(err); process.exit(1); });
