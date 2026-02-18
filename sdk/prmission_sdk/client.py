import time
from typing import Optional, Tuple, Dict, Any
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware
from .constants import (
    PRMISSION_V2_ADDRESS, USDC_BASE_ADDRESS, BASE_MAINNET_RPC, BASE_CHAIN_ID,
    PRMISSION_V2_ABI, ERC20_ABI, USDC_DECIMALS, PROTOCOL_FEE_BPS,
    BPS_DENOMINATOR, DISPUTE_WINDOW, PermissionStatus, EscrowStatus,
)

class PrmissionSDK:
    def __init__(self, private_key, rpc_url=BASE_MAINNET_RPC, contract_address=PRMISSION_V2_ADDRESS, usdc_address=USDC_BASE_ADDRESS, gas_multiplier=1.2):
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        if not self.w3.is_connected():
            raise ConnectionError(f"Cannot connect to {rpc_url}")
        self.account = self.w3.eth.account.from_key(private_key)
        self.address = self.account.address
        self.gas_multiplier = gas_multiplier
        self.contract = self.w3.eth.contract(address=Web3.to_checksum_address(contract_address), abi=PRMISSION_V2_ABI)
        self.usdc = self.w3.eth.contract(address=Web3.to_checksum_address(usdc_address), abi=ERC20_ABI)
        print(f"SDK initialized | Address: {self.address} | Base Mainnet")

    def _send_tx(self, tx_func, description=""):
        nonce = self.w3.eth.get_transaction_count(self.address)
        tx = tx_func.build_transaction({
            "from": self.address, "nonce": nonce, "chainId": BASE_CHAIN_ID,
            "gas": 0, "maxFeePerGas": self.w3.eth.gas_price + self.w3.to_wei(1, "gwei"),
            "maxPriorityFeePerGas": self.w3.to_wei(0.001, "gwei"),
        })
        gas_estimate = self.w3.eth.estimate_gas(tx)
        tx["gas"] = int(gas_estimate * self.gas_multiplier)
        signed = self.account.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        print(f"  Sent: {description} | tx: {tx_hash.hex()}")
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        if receipt["status"] == 1:
            print(f"  Confirmed in block {receipt['blockNumber']} | https://basescan.org/tx/{tx_hash.hex()}")
        else:
            raise Exception(f"Transaction failed: {tx_hash.hex()}")
        return {"tx_hash": tx_hash.hex(), "receipt": receipt}

    def usdc_to_raw(self, amount):
        return int(amount * (10 ** USDC_DECIMALS))

    def raw_to_usdc(self, raw):
        return raw / (10 ** USDC_DECIMALS)

    def usdc_balance(self):
        return self.usdc.functions.balanceOf(self.address).call()

    def usdc_allowance(self):
        return self.usdc.functions.allowance(self.address, self.contract.address).call()

    def approve_usdc(self, amount):
        return self._send_tx(self.usdc.functions.approve(self.contract.address, amount), f"Approve {self.raw_to_usdc(amount)} USDC")

    def ensure_allowance(self, amount):
        current = self.usdc_allowance()
        if current < amount:
            print(f"  Approving USDC...")
            self.approve_usdc(2**256 - 1)

    def grant_permission(self, data_category, purpose, compensation_bps, validity_period, merchant="0x0000000000000000000000000000000000000000", upfront_fee=0):
        result = self._send_tx(
            self.contract.functions.grantPermission(Web3.to_checksum_address(merchant), data_category, purpose, compensation_bps, upfront_fee, validity_period),
            f"Grant Permission [{data_category}]"
        )
        logs = self.contract.events.PermissionGranted().process_receipt(result["receipt"])
        if logs:
            perm_id = logs[0]["args"]["permissionId"]
            print(f"  Permission ID: {perm_id}")
            return perm_id
        return self.contract.functions.nextPermissionId().call() - 1

    def revoke_permission(self, permission_id):
        return self._send_tx(self.contract.functions.revokePermission(permission_id), f"Revoke Permission #{permission_id}")

    def deposit_escrow(self, permission_id, amount, agent_id=0):
        perm = self.get_permission(permission_id)
        total_needed = amount + perm["upfront_fee"]
        self.ensure_allowance(total_needed)
        result = self._send_tx(
            self.contract.functions.depositEscrow(permission_id, amount, agent_id),
            f"Deposit Escrow [{self.raw_to_usdc(amount)} USDC]"
        )
        logs = self.contract.events.EscrowDeposited().process_receipt(result["receipt"])
        if logs:
            escrow_id = logs[0]["args"]["escrowId"]
            print(f"  Escrow ID: {escrow_id}")
            return escrow_id
        return self.contract.functions.nextEscrowId().call() - 1

    def report_outcome(self, escrow_id, outcome_value, outcome_type, outcome_description):
        return self._send_tx(
            self.contract.functions.reportOutcome(escrow_id, outcome_value, outcome_type, outcome_description),
            f"Report Outcome [Escrow #{escrow_id}]"
        )

    def settle(self, escrow_id):
        return self._send_tx(self.contract.functions.settle(escrow_id), f"Settle [Escrow #{escrow_id}]")

    def dispute(self, escrow_id, reason):
        return self._send_tx(self.contract.functions.disputeSettlement(escrow_id, reason), f"Dispute [Escrow #{escrow_id}]")

    def refund_escrow(self, escrow_id):
        return self._send_tx(self.contract.functions.refundEscrow(escrow_id), f"Refund [Escrow #{escrow_id}]")

    def get_permission(self, permission_id):
        p = self.contract.functions.permissions(permission_id).call()
        return {"user": p[0], "merchant": p[1], "data_category": p[2], "purpose": p[3], "compensation_bps": p[4], "upfront_fee": p[5], "valid_until": p[6], "status": p[7], "status_name": ["INACTIVE","ACTIVE","REVOKED","EXPIRED"][p[7]], "created_at": p[8], "revoked_at": p[9]}

    def get_escrow(self, escrow_id):
        e = self.contract.functions.escrows(escrow_id).call()
        return {"permission_id": e[0], "agent": e[1], "agent_id": e[2], "amount": e[3], "amount_usdc": self.raw_to_usdc(e[3]), "outcome_value": e[4], "outcome_type": e[5], "outcome_description": e[6], "reported_at": e[7], "status": e[8], "status_name": ["NONE","FUNDED","OUTCOME_REPORTED","DISPUTED","SETTLED","REFUNDED"][e[8]], "created_at": e[9]}

    def check_access(self, permission_id, agent_address=None):
        agent = agent_address or self.address
        result = self.contract.functions.checkAccess(permission_id, Web3.to_checksum_address(agent)).call()
        return {"permitted": result[0], "compensation_bps": result[1], "upfront_fee": result[2], "valid_until": result[3]}

    def preview_settlement(self, escrow_id):
        result = self.contract.functions.previewSettlement(escrow_id).call()
        return {"user_share": result[0], "user_share_usdc": self.raw_to_usdc(result[0]), "protocol_fee": result[1], "protocol_fee_usdc": self.raw_to_usdc(result[1]), "agent_refund": result[2], "agent_refund_usdc": self.raw_to_usdc(result[2])}

    def get_user_permissions(self, user=None, offset=0, limit=50):
        addr = user or self.address
        return self.contract.functions.getUserPermissions(Web3.to_checksum_address(addr), offset, limit).call()

    def get_permission_escrows(self, permission_id):
        return self.contract.functions.getPermissionEscrows(permission_id).call()

    def get_protocol_stats(self):
        fees = self.contract.functions.totalProtocolFees().call()
        volume = self.contract.functions.totalSettledVolume().call()
        next_perm = self.contract.functions.nextPermissionId().call()
        next_esc = self.contract.functions.nextEscrowId().call()
        identity = self.contract.functions.identityEnforced().call()
        reputation = self.contract.functions.reputationEnforced().call()
        return {"total_protocol_fees_usdc": self.raw_to_usdc(fees), "total_settled_volume_usdc": self.raw_to_usdc(volume), "total_permissions": next_perm - 1, "total_escrows": next_esc - 1, "identity_enforced": identity, "reputation_enforced": reputation}
