const { ethers } = require("ethers");
const { PrmissionClient } = require("../src");
async function main() {
  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
  const wallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider);
  const client = new PrmissionClient({ signer: wallet });
  console.log("=== Prmission - AI Agent Flow ===");
  console.log("Agent address:", await client.getAddress());
  console.log("USDC Balance:", await client.getUSDCBalance(), "USDC\n");
  const permissionId = 1;
  const permission = await client.getPermission(permissionId);
  console.log("Data type:", permission.dataType);
  console.log("Active:", permission.active);
  if (!permission.active) { console.log("Permission not active."); return; }
  console.log("Depositing escrow...");
  const { escrowId } = await client.depositEscrow({ permissionId, amount: 100 });
  console.log("Escrow ID:", escrowId.toString());
  console.log("Reporting outcome...");
  await client.reportOutcome(escrowId, 80);
  console.log("Outcome reported: 80 USDC");
  const { ready, timeRemaining } = await client.isSettleable(escrowId);
  if (ready) {
    const result = await client.settle(escrowId);
    console.log("User received:", result.userPayout, "USDC");
    console.log("Protocol fee:", result.protocolFee, "USDC");
    console.log("Agent received:", result.agentPayout, "USDC");
  } else {
    console.log("Dispute window:", Math.ceil(timeRemaining / 3600), "hours remaining");
  }
}
main().catch(console.error);
