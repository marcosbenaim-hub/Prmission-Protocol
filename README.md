# Prmission Protocol

**Where Autonomous AI agents pay humans on-chain.**

> OpenAI gave agents a brain. Google and Apple gave them reach. **Prmission gives us a wallet.**

Prmission Protocol is the consent-gated settlement layer for AI agent commerce on-chain. Autonomous AI agents pay users for consented data access through the Prmission smart contract — with **Ethereum** ERC-8004 identity verification, escrow, and settlement on Base (**Ethereum** L2).

**3% protocol fee. Hardcoded on-chain. Non-negotiable.**

---

## 🔗 Live Deployment

| Network | Contract Address | Status |
|---------|-----------------|--------|
| **Base Mainnet (Ethereum L2)** | [`0x0c8B16a57524f4009581B748356E01e1a969223d`](https://basescan.org/address/0x0c8B16a57524f4009581B748356E01e1a969223d#code) | ✅ Verified |

- **Payment Token:** USDC on Base ([`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`](https://basescan.org/address/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913))
- **Protocol Fee:** 3% (hardcoded in the Prmission smart contract)
- **Solidity Version:** 0.8.24
- **Framework:** Hardhat
- **Identity Standard:** Ethereum ERC-8004

---

## The Problem

Autonomous AI agents can act, but they still can't natively settle permissioned data transactions. There is no default protocol that combines permission, escrow, dispute handling, and payout in one deterministic on-chain flow. Without a neutral settlement layer, agent commerce fragments into ad hoc, platform-specific rails.

## The Solution

Prmission Protocol is the on-chain settlement layer **below** the agent stack. We don't compete with ChatGPT, Apple, or Google agent platforms. They provide intelligence and distribution — Prmission Protocol provides the smart contract layer: permission, escrow, and settlement.

We don't need to own the interface or model. We monetize the settlement event beneath them.

### Why Prmission Protocol Wins

1. **Immutable monetization** — 3% fee is hardcoded in the Prmission smart contract on-chain. Not even we can change it. That's the trust primitive.
2. **Neutral position** — We integrate under agent platforms instead of competing with them.
3. **Fast compounding** — As agent transactions scale, settlement events scale. Revenue is protocol-native, not sales-team dependent.

---

## Protocol Mechanics

**Five steps. Verified on-chain via the Prmission smart contract.**

```
User grants permission → Agent deposits escrow (USDC)
→ Agent uses data & reports outcome → 24hr dispute window
→ Settlement: User gets paid, protocol takes 3%, agent gets remainder
```

| Step | Function | What Happens |
|------|----------|-------------|
| 1 | `grantPermission()` | User defines scope, purpose, fee, duration. **Ethereum** ERC-8004 verifies agent identity on-chain. |
| 2 | `depositEscrow()` | AI agent locks USDC into the Prmission smart contract before data access. |
| 3 | `reportOutcome()` | Outcome reported on-chain via the Prmission smart contract after task completion. |
| 4 | `disputeSettlement()` | 24-hour dispute window enforced on-chain by the Prmission smart contract. |
| 5 | `settle()` | Prmission smart contract auto-distributes: user paid, protocol takes 3% on-chain, agent gets remainder. |

### Settlement Example

```
Outcome value: $500 USDC (user fee: 2%)

User receives (2%)      →  $10.00
Protocol receives (3%)  →  $15.00
Agent receives remainder → $475.00
```

---

## Traction

- ✅ Prmission smart contract **live on Base (Ethereum L2)** with verified deployment
- ✅ First live end-to-end transfer recorded: **February 6, 2026**
- ✅ Built an AI agent that completes full settlement flows on-chain using the Prmission smart contract
- ✅ **Hundreds of simulated settlements** processed end-to-end
- ✅ Protocol fee capture verified at **3% on-chain**
- ✅ **51 tests passing** across core flows and V2 improvements

---

## Technical Architecture

**Three layers. One economic primitive.**

| Layer | Description |
|-------|------------|
| **User Interface** | Prmission Crypto Wallet — consent UX, fee visibility, controls |
| **Prmission SDK** | Policy and integration surface for autonomous AI agents (COSS — open source) |
| **Blockchain** | Prmission smart contract on Base (**Ethereum** L2): consent, escrow, disputes, settlement via **Ethereum** ERC-8004 |

### Contract Architecture

```
PrmissionV2
├── ReentrancyGuard    (OpenZeppelin - prevents reentrancy attacks)
├── Pausable           (OpenZeppelin - emergency stop)
├── Ownable            (OpenZeppelin - admin functions)
├── IERC8004Identity   (Ethereum ERC-8004 identity verification)
└── IERC8004Reputation (Ethereum ERC-8004 reputation gating)
```

### Core Functions

| Function | Who Calls It | What It Does |
|----------|-------------|-------------|
| `grantPermission()` | User | Grant an agent permission to access data |
| `revokePermission()` | User | Revoke a previously granted permission |
| `depositEscrow()` | Agent | Lock USDC to access user data |
| `reportOutcome()` | Agent | Report what value the data generated |
| `disputeSettlement()` | User or Agent | Challenge the reported outcome |
| `settle()` | User, Agent, or Owner | Distribute funds after dispute window |
| `resolveDispute()` | Owner | Resolve a disputed escrow with custom split |
| `refundEscrow()` | Agent or Owner | Refund escrow after revocation/dispute |

### Admin Functions

| Function | What It Does |
|----------|-------------|
| `setTreasury()` | Update the protocol treasury address |
| `setIdentityRegistry()` | Set the Ethereum ERC-8004 identity contract |
| `setReputationRegistry()` | Set the Ethereum ERC-8004 reputation contract |
| `setIdentityEnforcement()` | Toggle identity verification on/off |
| `setReputationEnforcement()` | Toggle reputation gating on/off |
| `setTrustedReviewers()` | Set trusted reviewer addresses (max 50) |
| `pause() / unpause()` | Emergency stop the protocol |
| `rescueTokens()` | Recover accidentally sent tokens |

---

## V2 Improvements

- **Fair Payouts** — User share calculated from escrowed amount, not agent-reported outcome value
- **Outcome Value Capping** — Reported values capped at escrow amount to prevent fund locks
- **Flexible Dispute Resolution** — Owner can resolve disputes with custom splits (50/50, 70/30, full refund)
- **Revocation Grace Period** — Active escrows get 60-second grace period after permission revocation
- **Pausable** — Emergency stop mechanism for the entire protocol
- **Token Rescue** — Recover accidentally sent tokens (except payment token)
- **Pagination** — Efficient querying of user permissions
- **Multiple Escrows** — Track multiple escrows per permission

---

## Ethereum ERC-8004 Trust Verification

Prmission integrates with [Ethereum ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) for identity and reputation gating:

- **Identity Verification** — Agents can be required to hold an Ethereum ERC-8004 identity NFT
- **Reputation Gating** — Agents must meet minimum reputation score from trusted reviewers before accessing user data

---

## Constants

| Constant | Value | Description |
|----------|-------|------------|
| `PROTOCOL_FEE_BPS` | 300 (3%) | Fee taken by the protocol on every settlement — **hardcoded, immutable** |
| `DISPUTE_WINDOW` | 24 hours | Time for either party to dispute an outcome |
| `REVOCATION_GRACE` | 60 seconds | Grace period after permission revocation |
| `MAX_REVIEWERS` | 50 | Maximum trusted reviewers for reputation |
| `MAX_COMPENSATION_BPS` | 5000 (50%) | Maximum user compensation percentage |

---

## Market Opportunity

Every agent action needing user data becomes a settlement event. Bookings, purchases, recommendations, and data-backed execution increasingly require permissioned access verified via **Ethereum** ERC-8004.

These are transaction opportunities, not just product interactions. **Every person becomes a data merchant through Prmission Protocol.**

As autonomous AI agents scale transactions, Prmission Protocol captures settlement volume by default on-chain.

---

## Roadmap

**Phase 1: Validate** — Run settlements through the Prmission smart contract on-chain, prove completion and dispute reliability.

**Phase 2: Integrate** — Embed with agent builders across OpenAI, Google, and Apple ecosystems. Ethereum ERC-8004 identity verification live.

**Phase 3: Scale** — Grow settlement volume as agent autonomy increases. Every transaction settles on-chain through Prmission Protocol.

---

## Development

### Prerequisites

- Node.js (v18-v22 recommended)
- npm

### Setup

```bash
git clone https://github.com/marcosbenaim-hub/Prmission-Protocol.git
cd Prmission-Protocol
npm install
```

### Environment Variables

Create a `.env` file:

```
DEPLOYER_PRIVATE_KEY=your_private_key_here
PAYMENT_TOKEN_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
TREASURY_ADDRESS=your_treasury_address_here
```

### Compile

```bash
npx hardhat compile
```

### Test

```bash
npx hardhat test
```

51 tests passing covering all core flows, edge cases, and V2 improvements.

### Deploy

```bash
npx hardhat run scripts/deployV2.js --network base
```

### Verify on BaseScan

```bash
npx hardhat verify --network base <CONTRACT_ADDRESS> "<PAYMENT_TOKEN>" "<TREASURY>"
```

---

## Security

- **ReentrancyGuard** on all functions that transfer tokens
- **SafeERC20** for all token transfers
- **Custom errors** for gas-efficient reverts
- **Pausable** emergency stop
- **Compensation cap** at 50% to prevent mathematical edge cases
- **Escrow math sanity check** ensures compensation + fee never exceeds 100%
- **Grace period enforcement** on revocation to protect active escrows

---

## Founder

**Marcos Benaim** — Solo founder. Built Prmission Protocol live in 5 days with no prior coding experience, using Claude. Shipped from zero to a live Prmission smart contract on Base (Ethereum L2) with working consent, escrow, and settlement mechanics.

---

## Pitch Deck

📄 [View YC S26 Pitch Deck](docs/1.1Prmission_YC_S26_Deck.pdf)

---

## Links

- **Website:** [prmission.com](https://prmission.com)
- **BaseScan (Verified):** [View Contract](https://basescan.org/address/0x0c8B16a57524f4009581B748356E01e1a969223d#code)
- **Ethereum ERC-8004 Specification:** [EIP-8004](https://eips.ethereum.org/EIPS/eip-8004)
- **Base Network:** [base.org](https://base.org)

---

## License

MIT

---

**Prmission: Where Autonomous AI agents pay humans on-chain.**
