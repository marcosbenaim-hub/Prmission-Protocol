require("dotenv/config");
const hre = require("hardhat");

async function main() {
  const wallet = new hre.ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, hre.ethers.provider);
  console.log("Deploying with:", wallet.address);

  const PAYMENT_TOKEN = process.env.PAYMENT_TOKEN_ADDRESS;
  const TREASURY = process.env.TREASURY_ADDRESS;

  const Prmission = await hre.ethers.getContractFactory("Prmission", wallet);
  const prmission = await Prmission.deploy(PAYMENT_TOKEN, TREASURY);
  await prmission.waitForDeployment();

  const addr = await prmission.getAddress();
  console.log("Prmission deployed to:", addr);
  console.log("Treasury:", TREASURY);

  const fs = require("fs");
  fs.writeFileSync("deployment.json", JSON.stringify({
    network: hre.network.name,
    prmission: addr,
    paymentToken: PAYMENT_TOKEN,
    treasury: TREASURY,
    deployedAt: new Date().toISOString(),
    deployer: wallet.address
  }, null, 2));
  console.log("Saved to deployment.json");
}

main().catch((err) => { console.error(err); process.exit(1); });
