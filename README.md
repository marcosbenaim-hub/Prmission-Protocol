# Prmission Protocol — Smart Contract

The thing that collects the 3%. Now with ERC-8004 trust verification.

## What Changed (v2)

Same escrow, same settlement, same 3% fee. Now the contract can verify agents
against the ERC-8004 Identity and Reputation registries before letting them
access user data.

**Two modes:**

- **Backward compatible** (default) — Any address can deposit escrow. Works exactly like v1.
- **ERC-8004 enforced** — Only registered agents with sufficient reputation can deposit.

You flip the switch when Ecco's registries are deployed. Nothing breaks in the meantime.

## ERC-8004 Integration

ERC-8004 provides three registries: Identity, Reputation, Validation.
Prmission reads Identity and Reputation:

| Registry | What Prmission Checks | When |
|----------|----------------------|------|
| Identity | Is this agent registered? Is the caller the owner or wallet? | `depositEscrow()` |
| Reputation | Does this agent meet minimum trust score from trusted reviewers? | `depositEscrow()` |

### New Functions

| Function | Who Calls | What It Does |
|----------|-----------|--------------|
| `setIdentityRegistry()` | Owner | Point at deployed ERC-8004 Identity Registry |
| `setReputationRegistry()` | Owner | Point at deployed ERC-8004 Reputation Registry |
| `setIdentityEnforcement()` | Owner | Toggle identity verification on/off |
| `setReputationEnforcement()` | Owner | Toggle reputation gating + set minimum score |
| `setTrustedReviewers()` | Owner | Set which reviewer addresses count for reputation |
| `checkAgentTrust()` | Anyone (view) | Pre-check an agent's trust status without depositing |

### depositEscrow() Change

Now takes a third parameter: `agentId` (the ERC-8004 token ID).

```solidity
// v1 (still works when identity not enforced)
depositEscrow(permissionId, amount, 0)

// v2 with ERC-8004
depositEscrow(permissionId, amount, agentId)
```

## Quick Start

```bash
npm install
npx hardhat test        # run all 30+ tests
```

## Deploy

```bash
cp .env.example .env
# Edit .env with your private key and treasury address

npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js --network base-sepolia
```

## Enable ERC-8004 (after Ecco deploys registries)

```javascript
// From your deployer wallet:
await prmission.setIdentityRegistry("0x...ecco_identity_registry...");
await prmission.setReputationRegistry("0x...ecco_reputation_registry...");
await prmission.setTrustedReviewers(["0x...reviewer1...", "0x...reviewer2..."]);

// Flip the switches:
await prmission.setIdentityEnforcement(true);
await prmission.setReputationEnforcement(true, 50, 0); // min score 50, 0 decimals
```

## The Math (unchanged)

On a $500 flight booking where user terms are 2% compensation:

```
User gets:     2% × $500 = $10.00
Protocol gets: 3% × $500 = $15.00  ← this is the business
Agent gets:    $50.00 escrow - $10.00 - $15.00 = $25.00 back
```

## Files

```
contracts/
  Prmission.sol                    ← The contract. ~380 lines. Consent + escrow + ERC-8004.
  interfaces/
    IERC8004Identity.sol           ← Interface to read ERC-8004 Identity Registry
    IERC8004Reputation.sol         ← Interface to read ERC-8004 Reputation Registry
  MockUSDC.sol                     ← Test token
  MockIdentityRegistry.sol         ← Test mock of ERC-8004 Identity
  MockReputationRegistry.sol       ← Test mock of ERC-8004 Reputation
scripts/
  deploy.js                        ← Deployment script for Base
test/
  Prmission.test.js                ← 30+ tests covering both modes
```
