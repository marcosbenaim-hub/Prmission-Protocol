Prmission Protocol
The economic layer for AI agent commerce. Live on Base mainnet.

Contract address: 
0x0c8B16a57524f4009581B748356E01e1a969223d
BaseScan link: 
https://basescan.org/address/0x0c8B16a57524f4009581B748356E01e1a969223d

This shows a real Prmission transaction, real USDC, deployed on mainnet — not just a demo.
Prmission is a consent-gated escrow and settlement protocol for AI agents transacting on behalf of users. When an agent wants to access user data — to book a flight, make a recommendation, run a search — it deposits USDC escrow, reports the outcome, and the contract settles automatically: user gets compensated, protocol takes 3%, agent gets the rest back.
The 3% fee is hardcoded on-chain at 300 basis points. Non-negotiable. Every transaction that settles through this contract pays it.

How It Works

1. User grants permission     → grantPermission()
2. Agent deposits escrow      → depositEscrow()     ← ERC-8004 identity + reputation verified
3. Agent reports outcome      → reportOutcome()
4. 24-hour dispute window     → disputeSettlement()  (optional)
5. Settlement executes        → settle()
  → User gets their cut
  → Protocol gets 3%
  → Agent gets remainder back

The Math
On a $500 flight booking where the user set 2% compensation:
User gets:     2% × $500 = $10.00
Protocol gets: 3% × $500 = $15.00
Agent gets:    $50 escrow − $10 − $15 = $25.00 back

The fee is calculated on the outcome value, not the escrow amount.

What’s in This Repo

contracts/
 Prmission.sol                     ← The protocol. 450 lines. Consent + escrow + settlement + ERC-8004.
 interfaces/
   IERC8004Identity.sol            ← Interface for ERC-8004 Identity Registry
   IERC8004Reputation.sol          ← Interface for ERC-8004 Reputation Registry
 MockUSDC.sol                      ← Test token
 MockIdentityRegistry.sol          ← ERC-8004 identity mock for testing
 MockReputationRegistry.sol        ← ERC-8004 reputation mock for testing
scripts/
 deploy.js                         ← Deployment script (Base Sepolia + mainnet)
 demo-local.js                     ← Full 12-step lifecycle demo (runs offline)
test/
 Prmission.test.js                 ← 30+ tests across 5 test groups
CHANGELOG.md                        ← 12 discrepancy fixes between contract and docs
deployment.json     

Deployment
Live on Base mainnet (Chain ID: 8453).

ERC-8004 Integration
The contract optionally verifies agents against ERC-8004 Identity and Reputation registries before allowing escrow deposits. Two modes:
Backward compatible (current) — Any address can deposit escrow. Works without registries.
ERC-8004 enforced — Only registered agents with sufficient reputation can deposit. Flip the switch when registries are deployed. Nothing breaks.

Run Locally:

The demo reproduces the complete lifecycle: deploy contracts, register agent, earn reputation, grant permission, deposit escrow, report outcome, fast-forward dispute window, settle. Protocol collects $15 on a $500 booking. All local, all in-memory, ~3 seconds.

Relationship to Ecco
Ecco is the P2P network where AI agents discover, communicate, and negotiate with each other. Prmission is the settlement layer — where money changes hands.
Ecco decides who’s trustworthy (ERC-8004 identity + reputation). Prmission decides whether they can access data and takes 3% when they do. The contract reads Ecco’s registries to verify agents before letting them deposit escrow.
Ecco is the network. Prmission is the business on top of it.
Key Design Decisions
3% hardcoded on-chain. PROTOCOL_FEE_BPS = 300 is a constant, not a variable. There is no admin function to change it. This is intentional — agents and users can trust the fee will never change.
Escrow before access. Agents must lock funds before touching user data. No escrow, no access.
24-hour dispute window. After an agent reports an outcome, either party has 24 hours to dispute before settlement executes. This protects users from fraudulent outcome reporting.
User sets compensation. The compensationBps is set by the user when granting permission, not by the agent or the protocol. Users control what they earn.
Backward compatible ERC-8004. The contract works today without any registries. When Ecco deploys ERC-8004 on Base, the owner flips two booleans and reputation gating activates. No redeployment needed.
License
