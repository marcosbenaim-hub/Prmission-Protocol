# Prmission V2

Prmission Protocol V2 is a consent-gated data exchange protocol built for the AI agent economy. As autonomous agents increasingly need access to personal data — for bookings, recommendations, purchases, and more — Prmission ensures every data interaction requires explicit, revocable user permission with atomic escrow settlement and ERC-8004 trust verification. Users stay in control. Agents pay for access. Everything settles onchain.

---

## 🔗 Live Deployment

| Network | Contract Address | Status |
|---------|-----------------|--------|
| **Base Mainnet** | [`0x0c8B16a57524f4009581B748356E01e1a969223d`](https://basescan.org/address/0x0c8B16a57524f4009581B748356E01e1a969223d#code) | ✅ Verified |

- **Payment Token:** USDC on Base ([`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`](https://basescan.org/address/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913))
- **Protocol Fee:** 3%
- **Solidity Version:** 0.8.24
- **Framework:** Hardhat

---

## How It Works

### The Flow

```
User grants permission → Agent deposits escrow (USDC)
→ Agent uses data & reports outcome → 24hr dispute window
→ Settlement: User gets paid, protocol takes 3% fee, agent gets remainder
```

### Step by Step

1. **User Grants Permission** — A user decides what data to share, with whom, for how long, and at what price (compensation %).

2. **Agent Deposits Escrow** — An agent (company/merchant) locks USDC into escrow to access the user's data. The user receives any upfront fee immediately.

3. **Outcome Reporting** — The agent reports what value was generated from the data (e.g., a booking, a conversion, an ad impression).

4. **Dispute Window** — Both parties have 24 hours to dispute the outcome if something seems wrong.

5. **Settlement** — After the dispute window, funds are distributed:
   - **User** receives their compensation share
   - **Protocol** takes a 3% fee
   - **Agent** gets back the remainder

---

## Key Features

### V2 Improvements (from audit)

- **Fair Payouts** — User share is calculated from the escrowed amount, not the agent-reported outcome value. This prevents agents from gaming the system.
- **Outcome Value Capping** — Reported outcome values are capped at the escrow amount to prevent fund locks.
- **Flexible Dispute Resolution** — Owner can resolve disputes with custom splits (e.g., 50/50, 70/30, full refund).
- **Revocation Grace Period** — When a user revokes permission, active escrows get a 60-second grace period to complete.
- **Pausable** — Emergency stop mechanism for the entire protocol.
- **Token Rescue** — Recover accidentally sent tokens (except the payment token).
- **Pagination** — Efficient querying of user permissions.
- **Multiple Escrows** — Track multiple escrows per permission.

### ERC-8004 Trust Verification

Prmission integrates with [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) for optional identity and reputation gating:

- **Identity Verification** — Agents can be required to hold an ERC-8004 identity NFT.
- **Reputation Gating** — Agents must meet a minimum reputation score from trusted reviewers before accessing user data.

---

## Contract Architecture

```
PrmissionV2
├── ReentrancyGuard    (OpenZeppelin - prevents reentrancy attacks)
├── Pausable           (OpenZeppelin - emergency stop)
├── Ownable            (OpenZeppelin - admin functions)
├── IERC8004Identity   (ERC-8004 identity verification)
└── IERC8004Reputation (ERC-8004 reputation gating)
```

### Core Functions

| Function | Who Calls It | What It Does |
|----------|-------------|--------------|
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
|----------|--------------|
| `setTreasury()` | Update the protocol treasury address |
| `setIdentityRegistry()` | Set the ERC-8004 identity contract |
| `setReputationRegistry()` | Set the ERC-8004 reputation contract |
| `setIdentityEnforcement()` | Toggle identity verification on/off |
| `setReputationEnforcement()` | Toggle reputation gating on/off |
| `setTrustedReviewers()` | Set trusted reviewer addresses (max 50) |
| `pause() / unpause()` | Emergency stop the protocol |
| `rescueTokens()` | Recover accidentally sent tokens |

---

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `PROTOCOL_FEE_BPS` | 300 (3%) | Fee taken by the protocol on every settlement |
| `DISPUTE_WINDOW` | 24 hours | Time for either party to dispute an outcome |
| `REVOCATION_GRACE` | 60 seconds | Grace period after permission revocation |
| `MAX_REVIEWERS` | 50 | Maximum trusted reviewers for reputation |
| `MAX_COMPENSATION_BPS` | 5000 (50%) | Maximum user compensation percentage |

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

```env
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

## License

BSL 1.1

---

## Links

- **BaseScan (Verified):** [View Contract](https://basescan.org/address/0x0c8B16a57524f4009581B748356E01e1a969223d#code)
- **ERC-8004 Specification:** [EIP-8004](https://eips.ethereum.org/EIPS/eip-8004)
- **Base Network:** [base.org](https://base.org)

---

Built by [Marcos Benaim](https://github.com/marcosbenaim-hub)
