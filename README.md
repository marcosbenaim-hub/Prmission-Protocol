# Prmission Protocol — Smart Contract

The thing that collects the 3%.

## What This Does

One Solidity contract that implements the entire Prmission Protocol:

- **Users** grant granular permissions (data category, purpose, compensation terms, expiry)
- **Agents** deposit USDC escrow to access user data
- **Agents** report outcomes (what they did with the data, transaction value)
- **24-hour dispute window** protects both parties
- **Settlement** splits payment automatically:
  - User gets their compensation (e.g., 2%)
  - **Protocol gets 3% — always, every transaction**
  - Agent gets the remainder back

## Deploy to Base Sepolia Testnet

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Edit .env with your private key and treasury address

# 3. Get testnet ETH
# Go to https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
# Or https://faucet.quicknode.com/base/sepolia

# 4. Compile
npm run compile

# 5. Test
npm run test

# 6. Deploy
npm run deploy:testnet

# 7. Verify on Basescan (optional)
npx hardhat verify --network base-sepolia <CONTRACT_ADDRESS> "<USDC_ADDRESS>" "<TREASURY_ADDRESS>"
```

## Contract Functions

| Function | Who Calls | What It Does |
|----------|-----------|--------------|
| `grantPermission()` | User | Creates a permission with terms |
| `revokePermission()` | User | Revokes consent, triggers 60s data deletion |
| `depositEscrow()` | Agent | Locks USDC, pays upfront fee to user |
| `reportOutcome()` | Agent | Reports what happened, starts dispute window |
| `disputeSettlement()` | User or Agent | Files dispute during 24hr window |
| `settle()` | Anyone | Executes payment split after window closes |
| `checkAccess()` | Anyone (view) | Checks if permission is valid for an agent |
| `previewSettlement()` | Anyone (view) | Shows what each party will receive |

## The Math

On a $500 flight booking where user terms are 2% compensation:

```
User gets:     2% × $500 = $10.00
Protocol gets: 3% × $500 = $15.00  ← this is the business
Agent gets:    $50.00 escrow - $10.00 - $15.00 = $25.00 back
```

## Files

```
contracts/
  Prmission.sol     ← The contract. ~300 lines. The whole protocol.
  MockUSDC.sol       ← Test token
scripts/
  deploy.js          ← Deployment script for Base
test/
  Prmission.test.js  ← 20+ tests covering every flow
```
