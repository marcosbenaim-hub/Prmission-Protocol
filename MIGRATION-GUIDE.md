# Prmission V1 → V2 Migration Guide

## Summary of All Fixes

### 🔴 Critical Fixes

| # | Issue | V1 Behavior | V2 Fix |
|---|-------|-------------|--------|
| C-1 | Agent gaming payouts | `settle()` calculates from `outcomeValue` (agent-controlled) | `settle()` calculates from `esc.amount` (locked at deposit) |
| C-2 | Funds locked forever | `outcomeValue > amount` causes permanent revert | `reportOutcome()` caps `outcomeValue` at `esc.amount` |
| C-3 | All-or-nothing disputes | Only `resolveDisputeForUser()` (100% to user, 0% fee) | `resolveDispute(escrowId, userBps)` — flexible split, protocol always gets 3% |

### 🟠 High Fixes

| # | Issue | V2 Fix |
|---|-------|--------|
| H-1 | Anyone can settle | `settle()` restricted to agent, user, or owner |
| H-2 | Stale ACTIVE permissions | `revokePermission()` auto-detects expiry |
| H-3 | Revocation blocks outcomes | `reportOutcome()` no longer requires ACTIVE permission |
| H-4 | Gas DoS on reviewers | `MAX_REVIEWERS = 50` enforced in `setTrustedReviewers()` |

### 🟡 Medium Fixes

| # | Issue | V2 Fix |
|---|-------|--------|
| M-1 | REVOCATION_GRACE unused | `refundEscrow()` enforces grace period via `perm.revokedAt` |
| M-2 | No token rescue | `rescueTokens()` added (excludes paymentToken) |
| M-3 | Unbounded user array | `getUserPermissions(user, offset, limit)` with pagination |
| M-4 | Open permissions unclear | NatSpec documents `merchant=address(0)` behavior |
| M-5 | No event on expire | `PermissionExpired` event added |
| M-6 | No escrow tracking | `permissionEscrows` mapping + `getPermissionEscrows()` |

### 🔵 Low / Informational Fixes

| # | Fix |
|---|-----|
| L-1 | Added `totalSettledVolume` to differentiate from `totalProtocolFees` |
| L-4 | Added `Pausable` with `pause()` / `unpause()` |
| L-5 | `reputationDecimals` kept for future use but documented |
| L-6 | Pragma locked to `0.8.24` (no caret) |
| New | Custom errors replace require strings (gas savings) |
| New | `TreasuryUpdated` event on treasury change |
| New | `DisputeResolved` event distinct from `SettlementCompleted` |
| New | `getUserPermissionCount()` helper |

---

## Deployment Steps

```bash
# 1. Set up your environment
cd Prmission-Protocol
cp .env.example .env
# Edit .env with:
#   PRIVATE_KEY=your_deployer_key
#   BASESCAN_API_KEY=your_key
#   BASE_RPC_URL=https://mainnet.base.org
#   USDC_BASE=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
#   TREASURY=your_treasury_address

# 2. Compile
forge build

# 3. Run tests
forge test -vvv

# 4. Deploy V2 to Base Mainnet
forge create src/PrmissionV2.sol:PrmissionV2 \
  --constructor-args $USDC_BASE $TREASURY \
  --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY

# 5. Configure V2 (copy settings from V1)
# Read V1 settings first:
cast call 0xb9A5F35a8EB45aD45b91dD83ed5b91986537B193 \
  "identityEnforced()(bool)" --rpc-url $BASE_RPC_URL

cast call 0xb9A5F35a8EB45aD45b91dD83ed5b91986537B193 \
  "reputationEnforced()(bool)" --rpc-url $BASE_RPC_URL

# Then set on V2:
cast send $V2_ADDRESS "setIdentityEnforcement(bool)" true \
  --rpc-url $BASE_RPC_URL --private-key $PRIVATE_KEY

cast send $V2_ADDRESS "setIdentityRegistry(address)" $IDENTITY_REGISTRY \
  --rpc-url $BASE_RPC_URL --private-key $PRIVATE_KEY

cast send $V2_ADDRESS "setReputationRegistry(address)" $REPUTATION_REGISTRY \
  --rpc-url $BASE_RPC_URL --private-key $PRIVATE_KEY

# 6. Update SDK/GUI to point to new V2 contract address
# 7. Announce migration to users — V1 escrows should be settled/refunded first
```

## V1 Wind-Down Checklist

Before directing all traffic to V2:

- [ ] Settle all pending V1 escrows (`OUTCOME_REPORTED` status)
- [ ] Refund all stuck V1 escrows (`FUNDED` on revoked permissions)
- [ ] Resolve all V1 disputes
- [ ] Update SDK contract address to V2
- [ ] Update GUI contract address to V2
- [ ] Update subgraph / indexer to V2
- [ ] Announce V1 deprecation to users
- [ ] Consider pausing V1 by transferring ownership to a dead address (V1 has no pause)

## Future Recommendation: Deploy Behind a Proxy

For V3+, deploy behind a UUPS or Transparent proxy so you can upgrade without migration:

```bash
forge create src/PrmissionV2.sol:PrmissionV2 \
  --constructor-args ... \
  # Deploy through OpenZeppelin Upgrades plugin
```

This avoids the need to migrate users between contract addresses in the future.
