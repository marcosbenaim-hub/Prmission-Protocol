const hre = require("hardhat");

async function main() {
  const [deployer, user, agent, reviewer] = await hre.ethers.getSigners();

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  PRMISSION PROTOCOL — FULL DEMO WITH ERC-8004");
  console.log("═══════════════════════════════════════════════════\n");

  // ─── Deploy Everything ───
  console.log("STEP 1: Deploy contracts\n");

  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  console.log("  USDC deployed to:", await usdc.getAddress());

  const Prmission = await hre.ethers.getContractFactory("Prmission");
  const prmission = await Prmission.deploy(await usdc.getAddress(), deployer.address);
  console.log("  Prmission deployed to:", await prmission.getAddress());
  console.log("  Treasury (3% goes here):", deployer.address);

  const MockIdentity = await hre.ethers.getContractFactory("MockIdentityRegistry");
  const identity = await MockIdentity.deploy();
  console.log("  ERC-8004 Identity Registry:", await identity.getAddress());

  const MockReputation = await hre.ethers.getContractFactory("MockReputationRegistry");
  const reputation = await MockReputation.deploy();
  await reputation.initialize(await identity.getAddress());
  console.log("  ERC-8004 Reputation Registry:", await reputation.getAddress());

  // ─── Configure ERC-8004 ───
  console.log("\nSTEP 2: Wire up ERC-8004\n");

  await prmission.setIdentityRegistry(await identity.getAddress());
  await prmission.setReputationRegistry(await reputation.getAddress());
  await prmission.setTrustedReviewers([reviewer.address]);
  await prmission.setIdentityEnforcement(true);
  await prmission.setReputationEnforcement(true, 50, 0);

  console.log("  Identity enforcement: ON");
  console.log("  Reputation enforcement: ON (min score: 50)");
  console.log("  Trusted reviewer:", reviewer.address);

  // ─── Agent registers in ERC-8004 ───
  console.log("\nSTEP 3: Agent registers identity (ERC-8004)\n");

  await identity.connect(agent).register("https://travelbot.example/.well-known/agent-card.json");
  console.log("  Agent registered as agentId: 1");
  console.log("  Agent address:", agent.address);
  console.log("  Agent card: https://travelbot.example/.well-known/agent-card.json");

  // ─── Agent gets reputation ───
  console.log("\nSTEP 4: Agent earns reputation\n");

  await reputation.connect(reviewer).setScore(1, 85);
  console.log("  Reviewer gave agent score: 85/100");
  console.log("  (Minimum required: 50)");

  // ─── Verify trust status ───
  console.log("\nSTEP 5: Check agent trust (pre-flight)\n");

  const [registered, authorized, reputable, repScore, repCount] =
    await prmission.checkAgentTrust(1, agent.address);
  console.log("  Registered:", registered);
  console.log("  Authorized:", authorized);
  console.log("  Reputable:", reputable);
  console.log("  Score:", repScore.toString());
  console.log("  Feedback count:", repCount.toString());

  // ─── Fund agent with USDC ───
  console.log("\nSTEP 6: Fund agent with USDC\n");

  const USDC = (n) => hre.ethers.parseUnits(n.toString(), 6);
  await usdc.mint(agent.address, USDC(1000));
  await usdc.connect(agent).approve(await prmission.getAddress(), USDC(1000));
  console.log("  Minted $1,000 USDC to agent");
  console.log("  Agent approved Prmission to spend");

  // ─── User grants permission ───
  console.log("\nSTEP 7: User grants permission\n");

  await prmission.connect(user).grantPermission(
    hre.ethers.ZeroAddress,      // any agent can use it
    "travel_preferences",         // data category
    "flight_booking",            // purpose
    200,                         // 2% compensation to user
    0,                           // no upfront fee
    86400 * 30                   // valid 30 days
  );
  console.log("  Permission #1 granted");
  console.log("  Data: travel_preferences");
  console.log("  Purpose: flight_booking");
  console.log("  User compensation: 2%");
  console.log("  Valid: 30 days");

  // ─── Agent deposits escrow ───
  console.log("\nSTEP 8: Agent deposits escrow (ERC-8004 verified)\n");

  await prmission.connect(agent).depositEscrow(
    1,            // permissionId
    USDC(50),     // $50 escrow
    1             // agentId (ERC-8004)
  );
  console.log("  Escrow #1 deposited: $50.00 USDC");
  console.log("  ERC-8004 identity: VERIFIED ✓");
  console.log("  ERC-8004 reputation: VERIFIED ✓ (85 >= 50)");

  // ─── Agent reports outcome ───
  console.log("\nSTEP 9: Agent reports outcome\n");

  await prmission.connect(agent).reportOutcome(
    1,                    // escrowId
    USDC(500),           // $500 flight booked
    "booking",           // outcome type
    "Flight LAX→NYC, Delta DL492, Feb 15"
  );
  console.log("  Outcome reported: $500.00 flight booking");
  console.log("  Type: booking");
  console.log("  Details: Flight LAX→NYC, Delta DL492, Feb 15");
  console.log("  24-hour dispute window started...");

  // ─── Fast-forward past dispute window ───
  console.log("\nSTEP 10: Dispute window passes (fast-forwarding 24h)\n");

  await hre.network.provider.send("evm_increaseTime", [86401]);
  await hre.network.provider.send("evm_mine");
  console.log("  24 hours passed. No disputes filed.");

  // ─── Preview settlement ───
  console.log("\nSTEP 11: Preview settlement\n");

  const [userShare, protocolFee, agentRefund] = await prmission.previewSettlement(1);
  console.log("  User gets:     $" + hre.ethers.formatUnits(userShare, 6));
  console.log("  Protocol gets: $" + hre.ethers.formatUnits(protocolFee, 6) + "  ← THE 3%");
  console.log("  Agent gets:    $" + hre.ethers.formatUnits(agentRefund, 6) + " back");

  // ─── Settle ───
  console.log("\nSTEP 12: Settlement executes\n");

  const treasuryBefore = await usdc.balanceOf(deployer.address);
  await prmission.settle(1);
  const treasuryAfter = await usdc.balanceOf(deployer.address);

  const userBal = await usdc.balanceOf(user.address);
  const agentBal = await usdc.balanceOf(agent.address);
  const fee = treasuryAfter - treasuryBefore;

  console.log("  ✅ SETTLED");
  console.log("  User received:     $" + hre.ethers.formatUnits(userBal, 6));
  console.log("  Protocol received: $" + hre.ethers.formatUnits(fee, 6));
  console.log("  Agent balance:     $" + hre.ethers.formatUnits(agentBal, 6));

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  DONE. Protocol collected $" + hre.ethers.formatUnits(fee, 6) + " on a $500 booking.");
  console.log("═══════════════════════════════════════════════════\n");
}

main().catch((err) => { console.error(err); process.exit(1); });
