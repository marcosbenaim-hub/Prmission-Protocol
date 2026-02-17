const { PrmissionClient } = require("../src");

async function main() {
  const client = new PrmissionClient({ network: "base" });
  console.log("=== Prmission Protocol - Read Only ===\n");
  const paused = await client.isPaused();
  console.log("Protocol paused:", paused);
  const owner = await client.getOwner();
  console.log("Protocol owner:", owner);
  const treasury = await client.getTreasury();
  console.log("Treasury:", treasury);
  try {
    const permission = await client.getPermission(1);
    console.log("\nPermission #1:");
    console.log("  User:", permission.user);
    console.log("  Agent:", permission.agent);
    console.log("  Data Type:", permission.dataType);
    console.log("  Compensation:", permission.compensationPercent + "%");
    console.log("  Active:", permission.active);
  } catch (err) {
    console.log("\nNo permissions found yet");
  }
}

main().catch(console.error);
