require("dotenv/config");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Testing with:", deployer.address);

  const V2_ADDRESS = "0x0c8B16a57524f4009581B748356E01e1a969223d";
  const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

  const prmission = await hre.ethers.getContractAt("PrmissionV2", V2_ADDRESS);
  const usdc = await hre.ethers.getContractAt("IERC20", USDC_ADDRESS);

  const balance = await usdc.balanceOf(deployer.address);
  console.log("USDC balance:", hre.ethers.formatUnits(balance, 6));

  const ethBal = await hre.ethers.provider.getBalance(deployer.address);
  console.log("ETH balance:", hre.ethers.formatEther(ethBal));

  // Step 1: Grant permission (as user)
  console.log("\n--- Step 1: Grant Permission ---");
  const tx1 = await prmission.grantPermission(
    hre.ethers.ZeroAddress,
    "travel_preferences",
    "booking",
    200,
    0,
    86400 * 30
  );
  await tx1.wait();
  console.log("Permission #1 granted!");

  // Step 2: Approve USDC
  console.log("\n--- Step 2: Approve USDC ---");
  const tx2 = await usdc.approve(V2_ADDRESS, hre.ethers.parseUnits("1", 6));
  await tx2.wait();
  console.log("Approved 1 USDC");

  // Step 3: Deposit escrow (as agent)
  console.log("\n--- Step 3: Deposit Escrow ---");
  const tx3 = await prmission.depositEscrow(1, hre.ethers.parseUnits("1", 6), 0);
  await tx3.wait();
  console.log("Deposited 1 USDC escrow!");

  // Step 4: Report outcome
  console.log("\n--- Step 4: Report Outcome ---");
  const tx4 = await prmission.reportOutcome(
    1,
    hre.ethers.parseUnits("1", 6),
    "booking",
    "Flight LAX-NYC"
  );
  await tx4.wait();
  console.log("Outcome reported!");

  console.log("\n=== SUCCESS: Full flow working on Base Mainnet! ===");
  console.log("Permission granted -> Escrow deposited -> Outcome reported");
  console.log("Settlement can happen after 24hr dispute window");
}

main().catch((err) => { console.error(err); process.exit(1); });
