#!/usr/bin/env python3
"""
Prmission Demo AI Agent
An AI agent that pays users for data access on Base mainnet.
"""
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from prmission_sdk import PrmissionSDK

load_dotenv('/Users/marcosbenaim/prmission-sdk/.env', override=True)

def main():
    print("")
    print("=" * 55)
    print("  PRMISSION PROTOCOL — AI AGENT DEMO")
    print("  Consent-gated data payments on Base mainnet")
    print("=" * 55)

    PRIVATE_KEY = os.getenv("PRIVATE_KEY")
    RPC_URL = os.getenv("RPC_URL", "https://mainnet.base.org")

    if not PRIVATE_KEY:
        print("ERROR: Set PRIVATE_KEY in your .env file")
        sys.exit(1)

    print("\n[1/6] Connecting to Base mainnet...")
    sdk = PrmissionSDK(private_key=PRIVATE_KEY, rpc_url=RPC_URL)

    eth_balance = sdk.w3.eth.get_balance(sdk.address)
    usdc_balance = sdk.usdc_balance()
    print(f"\n[2/6] Wallet status:")
    print(f"  ETH:  {sdk.w3.from_wei(eth_balance, 'ether'):.6f} ETH")
    print(f"  USDC: {sdk.raw_to_usdc(usdc_balance):.2f} USDC")

    if eth_balance == 0:
        print("\nERROR: You need ETH on Base for gas.")
        print("Bridge ETH at https://bridge.base.org")
        sys.exit(1)

    if usdc_balance < sdk.usdc_to_raw(1.0):
        print("\nERROR: You need at least 1 USDC on Base.")
        sys.exit(1)

    stats = sdk.get_protocol_stats()
    print(f"\n  Protocol stats:")
    print(f"  Permissions: {stats['total_permissions']} | Escrows: {stats['total_escrows']}")
    print(f"  Settled: ${stats['total_settled_volume_usdc']:.2f} | Fees: ${stats['total_protocol_fees_usdc']:.2f}")

    # STEP 1: User grants permission
    print("\n" + "-" * 55)
    print("[3/6] USER grants data permission...")
    print("-" * 55)

    perm_id = sdk.grant_permission(
        data_category="location_history",
        purpose="personalized_local_recommendations",
        compensation_bps=1000,
        validity_period=7 * 24 * 3600,
        upfront_fee=0,
    )

    perm = sdk.get_permission(perm_id)
    print(f"  Data: {perm['data_category']}")
    print(f"  User compensation: {perm['compensation_bps']/100}%")
    print(f"  Status: {perm['status_name']}")

    # STEP 2: Agent deposits escrow
    print("\n" + "-" * 55)
    print("[4/6] AI AGENT deposits 1 USDC escrow...")
    print("-" * 55)

    access = sdk.check_access(perm_id)
    print(f"  Access check: {'Permitted' if access['permitted'] else 'Denied'}")

    escrow_amount = sdk.usdc_to_raw(1.0)
    escrow_id = sdk.deposit_escrow(
        permission_id=perm_id,
        amount=escrow_amount,
        agent_id=0,
    )

    escrow = sdk.get_escrow(escrow_id)
    print(f"  Amount locked: ${escrow['amount_usdc']:.2f} USDC")

    # STEP 3: Agent uses data and reports outcome
    print("\n" + "-" * 55)
    print("[5/6] AI AGENT processes data and reports outcome...")
    print("-" * 55)

    user_data = {
        "location": "Toronto, ON",
        "preferences": ["vegetarian", "quiet atmosphere"],
    }
    print(f"  User location: {user_data['location']}")
    print(f"  Preferences: {', '.join(user_data['preferences'])}")
    print(f"  Recommendation: Try Planta — upscale plant-based dining")

    sdk.report_outcome(
        escrow_id=escrow_id,
        outcome_value=escrow_amount,
        outcome_type="recommendation_served",
        outcome_description="Personalized restaurant recommendation for Toronto",
    )

    # Settlement preview
    preview = sdk.preview_settlement(escrow_id)
    print(f"\n[6/6] Settlement preview (after 24hr dispute window):")
    print(f"  User receives:  ${preview['user_share_usdc']:.6f} USDC (10%)")
    print(f"  Protocol fee:   ${preview['protocol_fee_usdc']:.6f} USDC (3%)")
    print(f"  Agent receives: ${preview['agent_refund_usdc']:.6f} USDC (87%)")

    print(f"\n  To settle after 24 hours, run:")
    print(f"  sdk.settle({escrow_id})")

    # Final summary
    print("\n" + "=" * 55)
    print("  DEMO COMPLETE — Live on Base mainnet!")
    print("=" * 55)
    print(f"  Permission ID: {perm_id}")
    print(f"  Escrow ID:     {escrow_id}")
    print(f"  BaseScan: https://basescan.org/address/{sdk.contract.address}")

    stats = sdk.get_protocol_stats()
    print(f"\n  Updated stats:")
    print(f"  Permissions: {stats['total_permissions']} | Escrows: {stats['total_escrows']}")
    print("")

if __name__ == "__main__":
    main()
