const { ethers } = require("ethers");
const { PrmissionClient } = require("../src");
async function main() {
  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const client = new PrmissionClient({ signer: wallet });
  console.log("=== Prmission - User Flow ===");
  console.log("Connected as:", await client.getAddress());
  console.log("USDC Balance:", await client.getUSDCBalance(), "USDC\n");
  console.log("Step 1: Granting permission...");
  const { permissionId } = await client.grantPermission({
    agent: "0xAGENT_ADDRESS_HERE",
    dataType: "browsing_history",
    compensationPercent: 20,
    durationSeconds: 86400 * 30,
    upfrontFee: 5
  });
  console.log("Permission granted! ID:", permissionId.toString());
}
main().catch(console.error);
