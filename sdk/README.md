# Prmission SDK

The settlement layer for AI agents. Consent-gated data exchange with atomic escrow settlement on Base.

## Install

    npm install @prmission/sdk

## Quick Start

    const { PrmissionClient } = require('@prmission/sdk');
    const client = new PrmissionClient();
    const permission = await client.getPermission(1);

## The Flow

    User grants permission > Agent deposits escrow (USDC)
    > Agent reports outcome > 24hr dispute window
    > Settlement: User gets paid, protocol takes 3%, agent gets remainder

## User Functions

Grant Permission:

    const { permissionId } = await client.grantPermission({
      agent: '0x1234...',
      dataType: 'location',
      compensationPercent: 20,
      durationSeconds: 86400 * 30,
      upfrontFee: 5
    });

Revoke Permission:

    await client.revokePermission(permissionId);

## Agent Functions

Deposit Escrow (auto-approves USDC):

    const { escrowId } = await client.depositEscrow({ permissionId: 1, amount: 100 });

Report Outcome:

    await client.reportOutcome(escrowId, 80);

Settle:

    const result = await client.settle(escrowId);

## Read Functions

    const permission = await client.getPermission(1);
    const escrow = await client.getEscrow(1);
    const { ready, timeRemaining } = await client.isSettleable(1);
    const balance = await client.getUSDCBalance();

## Event Listeners

    client.onPermissionGranted('0xAgent', (event) => console.log(event));
    client.onEscrowDeposited(permissionId, (event) => console.log(event));
    client.onSettled((event) => console.log(event));

## Protocol Details

- Network: Base Mainnet
- Contract: 0x0c8B16a57524f4009581B748356E01e1a969223d
- Payment Token: USDC on Base
- Protocol Fee: 3%
- Dispute Window: 24 hours
- Trust Layer: ERC-8004

## License

BSL-1.1

Built by Marcos Benaim - Prmission Protocol
