PRMISSION_V2_ADDRESS = "0x0c8B16a57524f4009581B748356E01e1a969223d"
USDC_BASE_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
BASE_MAINNET_RPC = "https://mainnet.base.org"
BASE_CHAIN_ID = 8453
PROTOCOL_FEE_BPS = 300
BPS_DENOMINATOR = 10_000
DISPUTE_WINDOW = 86400
REVOCATION_GRACE = 60
MAX_COMPENSATION_BPS = 5000
USDC_DECIMALS = 6

class PermissionStatus:
    INACTIVE = 0
    ACTIVE = 1
    REVOKED = 2
    EXPIRED = 3

class EscrowStatus:
    NONE = 0
    FUNDED = 1
    OUTCOME_REPORTED = 2
    DISPUTED = 3
    SETTLED = 4
    REFUNDED = 5

ERC20_ABI = [
    {"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"stateMutability":"view","type":"function"}
]

PRMISSION_V2_ABI = [
    {"inputs":[{"name":"merchant","type":"address"},{"name":"dataCategory","type":"string"},{"name":"purpose","type":"string"},{"name":"compensationBps","type":"uint256"},{"name":"upfrontFee","type":"uint256"},{"name":"validityPeriod","type":"uint256"}],"name":"grantPermission","outputs":[{"name":"permissionId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"name":"permissionId","type":"uint256"}],"name":"revokePermission","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"name":"permissionId","type":"uint256"},{"name":"amount","type":"uint256"},{"name":"agentId","type":"uint256"}],"name":"depositEscrow","outputs":[{"name":"escrowId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"name":"escrowId","type":"uint256"},{"name":"outcomeValue","type":"uint256"},{"name":"outcomeType","type":"string"},{"name":"outcomeDescription","type":"string"}],"name":"reportOutcome","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"name":"escrowId","type":"uint256"},{"name":"reason","type":"string"}],"name":"disputeSettlement","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"name":"escrowId","type":"uint256"}],"name":"settle","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"name":"escrowId","type":"uint256"}],"name":"refundEscrow","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"name":"permissionId","type":"uint256"},{"name":"agent","type":"address"}],"name":"checkAccess","outputs":[{"name":"permitted","type":"bool"},{"name":"compensationBps","type":"uint256"},{"name":"upfrontFee","type":"uint256"},{"name":"validUntil","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"name":"agentId","type":"uint256"},{"name":"agentAddress","type":"address"}],"name":"checkAgentTrust","outputs":[{"name":"registered","type":"bool"},{"name":"authorized","type":"bool"},{"name":"reputable","type":"bool"},{"name":"repScore","type":"int128"},{"name":"repCount","type":"uint64"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"name":"user","type":"address"},{"name":"offset","type":"uint256"},{"name":"limit","type":"uint256"}],"name":"getUserPermissions","outputs":[{"name":"result","type":"uint256[]"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"name":"permissionId","type":"uint256"}],"name":"getPermissionEscrows","outputs":[{"name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"name":"user","type":"address"}],"name":"getUserPermissionCount","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"name":"escrowId","type":"uint256"}],"name":"previewSettlement","outputs":[{"name":"userShare","type":"uint256"},{"name":"protocolFee","type":"uint256"},{"name":"agentRefund","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"name":"","type":"uint256"}],"name":"permissions","outputs":[{"name":"user","type":"address"},{"name":"merchant","type":"address"},{"name":"dataCategory","type":"string"},{"name":"purpose","type":"string"},{"name":"compensationBps","type":"uint256"},{"name":"upfrontFee","type":"uint256"},{"name":"validUntil","type":"uint256"},{"name":"status","type":"uint8"},{"name":"createdAt","type":"uint256"},{"name":"revokedAt","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"name":"","type":"uint256"}],"name":"escrows","outputs":[{"name":"permissionId","type":"uint256"},{"name":"agent","type":"address"},{"name":"agentId","type":"uint256"},{"name":"amount","type":"uint256"},{"name":"outcomeValue","type":"uint256"},{"name":"outcomeType","type":"string"},{"name":"outcomeDescription","type":"string"},{"name":"reportedAt","type":"uint256"},{"name":"status","type":"uint8"},{"name":"createdAt","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"nextPermissionId","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"nextEscrowId","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"totalProtocolFees","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"totalSettledVolume","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"treasury","outputs":[{"name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"identityEnforced","outputs":[{"name":"","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"reputationEnforced","outputs":[{"name":"","type":"bool"}],"stateMutability":"view","type":"function"},
    {"anonymous":False,"inputs":[{"indexed":True,"name":"permissionId","type":"uint256"},{"indexed":True,"name":"user","type":"address"},{"indexed":True,"name":"merchant","type":"address"},{"indexed":False,"name":"dataCategory","type":"string"},{"indexed":False,"name":"purpose","type":"string"},{"indexed":False,"name":"compensationBps","type":"uint256"},{"indexed":False,"name":"upfrontFee","type":"uint256"},{"indexed":False,"name":"validUntil","type":"uint256"}],"name":"PermissionGranted","type":"event"},
    {"anonymous":False,"inputs":[{"indexed":True,"name":"escrowId","type":"uint256"},{"indexed":True,"name":"permissionId","type":"uint256"},{"indexed":True,"name":"agent","type":"address"},{"indexed":False,"name":"agentId","type":"uint256"},{"indexed":False,"name":"amount","type":"uint256"}],"name":"EscrowDeposited","type":"event"},
    {"anonymous":False,"inputs":[{"indexed":True,"name":"escrowId","type":"uint256"},{"indexed":False,"name":"outcomeValue","type":"uint256"},{"indexed":False,"name":"outcomeType","type":"string"},{"indexed":False,"name":"disputeWindowEnd","type":"uint256"}],"name":"OutcomeReported","type":"event"},
    {"anonymous":False,"inputs":[{"indexed":True,"name":"escrowId","type":"uint256"},{"indexed":False,"name":"userShare","type":"uint256"},{"indexed":False,"name":"protocolFee","type":"uint256"},{"indexed":False,"name":"agentRefund","type":"uint256"}],"name":"SettlementCompleted","type":"event"}
]
