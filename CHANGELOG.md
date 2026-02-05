# CHANGELOG — Prmission Protocol v2.0.0 Discrepancy Fixes

All discrepancies between the smart contract (on-chain truth), the OpenClaw SKILL.md,
the README, and supporting documentation have been resolved.

## Fixes Applied

### 1. Fee Percentage (CRITICAL)
- **File**: `SKILL.md` line 112
- **Was**: "Prmission takes a 15% platform fee"
- **Now**: "Prmission takes a 3% protocol fee on each settled transaction (applied to the outcome value, not the escrow amount)"
- **Source of truth**: `Prmission.sol` line 45 — `PROTOCOL_FEE_BPS = 300` (300 basis points = 3%)

### 2. Contract NatSpec — False Reputation Write Claim
- **File**: `Prmission.sol` NatSpec header
- **Was**: "After settlement, Prmission submits feedback to the Reputation Registry so completed transactions build on-chain trust."
- **Now**: "Reputation feedback submission after settlement is planned for a future version. Currently, the protocol reads reputation but does not write it."
- **Reason**: `settle()` does not call any reputation registry function. The claim was aspirational, not implemented.

### 3. Example Conversation — Misleading "escrowed" Phrasing
- **File**: `SKILL.md` line 85
- **Was**: "$3.50/mo escrowed"
- **Now**: "escrow deposited by buyer. You'll receive $3.50/mo minus 3% protocol fee ($3.40/mo net) once outcomes settle."
- **Reason**: Users need to see the net amount after the protocol fee. "Escrowed" conflated offer price with escrow deposit.

### 4. Version Alignment
- **Files**: `SKILL.md`, `openclaw-skill/package.json`
- **Was**: version `0.1.0`
- **Now**: version `2.0.0`
- **Reason**: Must match the contract's `prmission-contracts/package.json` which is `2.0.0`.

### 5. Line Count in README
- **File**: `README.md`
- **Was**: "~380 lines"
- **Now**: "~450 lines"
- **Reason**: The contract is 450 lines after ERC-8004 integration.

### 6. Reputation Capability Overstatement
- **File**: `SKILL.md`
- **Was**: "Display on-chain ERC-8004 reputation score and history"
- **Now**: "Display on-chain ERC-8004 reputation summary (aggregate score and review count from trusted reviewers via `checkAgentTrust()`)"
- **Reason**: The contract returns aggregate summaries, not individual history entries. History is on the Reputation Registry, not on Prmission.

### 7. On-Chain vs Off-Chain Boundary (NEW SECTION)
- **File**: `SKILL.md`
- **Added**: "On-Chain vs Off-Chain Boundary" table showing exactly what lives on-chain vs what the agent handles off-chain.
- **Reason**: Multiple capabilities described in SKILL.md (category toggles, auto-accept, counter-offers, auto-expire) have no on-chain implementation. The AI agent needs to understand this boundary to give accurate responses.

### 8. Toggle Category Clarification
- **File**: `SKILL.md`
- **Was**: Implied a single on-chain toggle per category
- **Now**: Explicitly notes this is an off-chain agent feature that maps to batch `revokePermission()` calls
- **Reason**: No global category toggle exists in the contract.

### 9. Counter-Offer Clarification
- **File**: `SKILL.md`
- **Was**: Implied counter-offers are on-chain
- **Now**: "off-chain negotiation via the Ecco P2P network; only the final accepted terms are recorded on-chain via `grantPermission()`"
- **Reason**: The contract has no counter-offer mechanism.

### 10. Accept Offer — Two-Step Flow
- **File**: `SKILL.md`
- **Was**: "triggers consent recording, escrow, and delivery" (implies single action)
- **Now**: "the agent calls `grantPermission()` on-chain with the agreed terms, then notifies the buyer to call `depositEscrow()`"
- **Reason**: These are separate transactions by different parties.

### 11. Auto-Accept / Auto-Expire Clarification
- **File**: `SKILL.md`
- **Was**: Implied these are on-chain features
- **Now**: Explicitly marked as agent-side policies with references to the contract functions they invoke
- **Reason**: Neither auto-accept nor auto-expire exist in the contract. They are agent behaviors.

### 12. Ecco/Dileet Naming Inconsistency
- **File**: `.env.example`
- **Was**: "Ecco/Dileet"
- **Now**: "Ecco"
- **Reason**: SKILL.md consistently uses "Ecco". Standardized.

## New: Fee Breakdown Section
- **File**: `SKILL.md`
- **Added**: Complete "Fee Breakdown & Settlement Math" section with table showing exact calculation for each component, plus key clarifications for the AI agent.
- **Reason**: The AI agent must never misrepresent fees. This section gives it the exact math and rules to follow.

## New: @prmission/sdk
- **Package**: `@prmission/sdk`
- **Status**: Complete TypeScript SDK with typed interfaces for all contract functions
- **Reason**: Referenced in `openclaw-skill/package.json` but did not exist. This is the critical bridge between the smart contract and the OpenClaw skill.
