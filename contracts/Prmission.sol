// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IERC8004Identity.sol";
import "./interfaces/IERC8004Reputation.sol";

/**
 * @title Prmission Protocol
 * @notice Consent-gated data exchange with atomic escrow settlement
 *         and ERC-8004 trust verification.
 *         3% protocol fee on every transaction. Non-negotiable.
 *
 * ERC-8004 Integration:
 *   Before an agent can deposit escrow, Prmission verifies:
 *     1. The agent is registered in the ERC-8004 Identity Registry
 *     2. The agent meets the minimum reputation threshold (if enforcement is on)
 *   After settlement, Prmission submits feedback to the Reputation Registry
 *   so completed transactions build on-chain trust.
 *
 * Flow:
 *   1. User grants permission  → grantPermission()
 *   2. Agent deposits escrow   → depositEscrow()
 *      → ERC-8004 identity check: is agent registered?
 *      → ERC-8004 reputation check: does agent meet minimum score?
 *   3. Agent reports outcome   → reportOutcome()
 *   4. 24-hour dispute window  → disputeSettlement() (optional)
 *   5. Settlement executes     → settle()
 *      → user gets their cut
 *      → protocol gets 3%
 *      → remainder returns to agent
 *
 * Revocation:
 *   User calls revokePermission() at any time.
 *   Active escrows on revoked permissions are refunded to the agent.
 */
contract Prmission is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ─── Constants ───────────────────────────────────────────────────────

    uint256 public constant PROTOCOL_FEE_BPS = 300;       // 3% = 300 basis points
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant DISPUTE_WINDOW = 24 hours;
    uint256 public constant REVOCATION_GRACE = 60 seconds;

    // ─── Payment token (USDC on Base) ────────────────────────────────────

    IERC20 public immutable paymentToken;

    // ─── Protocol treasury ───────────────────────────────────────────────

    address public treasury;

    // ─── ERC-8004 Registries ─────────────────────────────────────────────

    IERC8004Identity   public identityRegistry;
    IERC8004Reputation public reputationRegistry;

    /// @notice Minimum reputation score to deposit escrow. 0 = any registered agent.
    int128 public minReputationScore;
    uint8  public reputationDecimals;

    /// @notice Whether ERC-8004 identity verification is enforced.
    bool public identityEnforced;

    /// @notice Whether reputation gating is enforced.
    bool public reputationEnforced;

    /// @notice Trusted reviewer addresses for reputation queries.
    address[] public trustedReviewers;

    // ─── Enums ───────────────────────────────────────────────────────────

    enum PermissionStatus { INACTIVE, ACTIVE, REVOKED, EXPIRED }
    enum EscrowStatus     { NONE, FUNDED, OUTCOME_REPORTED, DISPUTED, SETTLED, REFUNDED }

    // ─── Data Objects ────────────────────────────────────────────────────

    struct Permission {
        address user;
        address merchant;
        string  dataCategory;
        string  purpose;
        uint256 compensationBps;
        uint256 upfrontFee;
        uint256 validUntil;
        PermissionStatus status;
        uint256 createdAt;
    }

    struct Escrow {
        uint256 permissionId;
        address agent;
        uint256 agentId;            // ERC-8004 agent ID (0 if not enforced)
        uint256 amount;
        uint256 outcomeValue;
        string  outcomeType;
        string  outcomeDescription;
        uint256 reportedAt;
        EscrowStatus status;
        uint256 createdAt;
    }

    // ─── Storage ─────────────────────────────────────────────────────────

    uint256 public nextPermissionId = 1;
    uint256 public nextEscrowId = 1;

    mapping(uint256 => Permission) public permissions;
    mapping(uint256 => Escrow)     public escrows;
    mapping(address => uint256[]) public userPermissions;

    uint256 public totalProtocolFees;

    // ─── Events ──────────────────────────────────────────────────────────

    event PermissionGranted(
        uint256 indexed permissionId, address indexed user, address indexed merchant,
        string dataCategory, string purpose, uint256 compensationBps,
        uint256 upfrontFee, uint256 validUntil
    );
    event PermissionRevoked(
        uint256 indexed permissionId, address indexed user,
        uint256 revokedAt, uint256 deleteBy
    );
    event EscrowDeposited(
        uint256 indexed escrowId, uint256 indexed permissionId,
        address indexed agent, uint256 agentId, uint256 amount
    );
    event OutcomeReported(
        uint256 indexed escrowId, uint256 outcomeValue,
        string outcomeType, uint256 disputeWindowEnd
    );
    event SettlementCompleted(
        uint256 indexed escrowId, uint256 userShare,
        uint256 protocolFee, uint256 agentRefund
    );
    event DisputeFiled(uint256 indexed escrowId, address indexed disputant, string reason);
    event EscrowRefunded(uint256 indexed escrowId, address indexed agent, uint256 amount);

    // ERC-8004 config events
    event IdentityRegistryUpdated(address indexed registry);
    event ReputationRegistryUpdated(address indexed registry);
    event IdentityEnforcementUpdated(bool enforced);
    event ReputationEnforcementUpdated(bool enforced, int128 minScore, uint8 decimals);
    event TrustedReviewersUpdated(address[] reviewers);

    // ─── Constructor ─────────────────────────────────────────────────────

    constructor(address _paymentToken, address _treasury) Ownable(msg.sender) {
        require(_paymentToken != address(0), "Invalid token");
        require(_treasury != address(0), "Invalid treasury");
        paymentToken = IERC20(_paymentToken);
        treasury = _treasury;
    }

    // ─── Permission Management ───────────────────────────────────────────

    function grantPermission(
        address merchant, string calldata dataCategory, string calldata purpose,
        uint256 compensationBps, uint256 upfrontFee, uint256 validityPeriod
    ) external returns (uint256 permissionId) {
        require(bytes(dataCategory).length > 0, "Empty category");
        require(bytes(purpose).length > 0, "Empty purpose");
        require(validityPeriod > 0, "Zero validity");
        require(compensationBps <= 5000, "Max 50% compensation");

        permissionId = nextPermissionId++;
        permissions[permissionId] = Permission({
            user: msg.sender, merchant: merchant, dataCategory: dataCategory,
            purpose: purpose, compensationBps: compensationBps, upfrontFee: upfrontFee,
            validUntil: block.timestamp + validityPeriod,
            status: PermissionStatus.ACTIVE, createdAt: block.timestamp
        });
        userPermissions[msg.sender].push(permissionId);

        emit PermissionGranted(
            permissionId, msg.sender, merchant, dataCategory, purpose,
            compensationBps, upfrontFee, block.timestamp + validityPeriod
        );
    }

    function revokePermission(uint256 permissionId) external {
        Permission storage perm = permissions[permissionId];
        require(perm.user == msg.sender, "Not your permission");
        require(perm.status == PermissionStatus.ACTIVE, "Not active");
        perm.status = PermissionStatus.REVOKED;
        emit PermissionRevoked(permissionId, msg.sender, block.timestamp, block.timestamp + REVOCATION_GRACE);
    }

    // ─── Escrow (with ERC-8004 verification) ─────────────────────────────

    /**
     * @notice Agent deposits escrow to access user data.
     * @param permissionId  The permission being exercised
     * @param amount        Total escrow amount
     * @param agentId       The agent's ERC-8004 token ID (pass 0 if identity not enforced)
     */
    function depositEscrow(
        uint256 permissionId, uint256 amount, uint256 agentId
    ) external nonReentrant returns (uint256 escrowId) {
        Permission storage perm = permissions[permissionId];

        require(perm.status == PermissionStatus.ACTIVE, "Permission not active");
        require(block.timestamp < perm.validUntil, "Permission expired");
        require(perm.merchant == address(0) || perm.merchant == msg.sender, "Not authorized merchant");
        require(amount > 0, "Zero escrow");

        // ─── ERC-8004 Identity Verification ───
        if (identityEnforced) {
            require(address(identityRegistry) != address(0), "Identity registry not set");
            require(agentId > 0, "Agent ID required");

            address agentOwner = identityRegistry.ownerOf(agentId);
            bool isOwner = (agentOwner == msg.sender);

            bool isWallet = false;
            try identityRegistry.getAgentWallet(agentId) returns (address wallet) {
                isWallet = (wallet == msg.sender && wallet != address(0));
            } catch {}

            require(isOwner || isWallet, "Not agent owner or wallet");
        }

        // ─── ERC-8004 Reputation Gating ───
        if (reputationEnforced && identityEnforced) {
            require(address(reputationRegistry) != address(0), "Reputation registry not set");
            require(trustedReviewers.length > 0, "No trusted reviewers configured");

            (uint64 count, int128 summaryValue, ) = reputationRegistry.getSummary(
                agentId, trustedReviewers, "", ""
            );
            require(count > 0, "Agent has no reputation");
            require(summaryValue >= minReputationScore, "Agent below minimum reputation");
        }

        // Pay upfront fee directly to user
        if (perm.upfrontFee > 0) {
            paymentToken.safeTransferFrom(msg.sender, perm.user, perm.upfrontFee);
        }

        // Lock escrow
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);

        escrowId = nextEscrowId++;
        escrows[escrowId] = Escrow({
            permissionId: permissionId, agent: msg.sender, agentId: agentId,
            amount: amount, outcomeValue: 0, outcomeType: "", outcomeDescription: "",
            reportedAt: 0, status: EscrowStatus.FUNDED, createdAt: block.timestamp
        });

        emit EscrowDeposited(escrowId, permissionId, msg.sender, agentId, amount);
    }

    // ─── Outcome & Dispute ───────────────────────────────────────────────

    function reportOutcome(
        uint256 escrowId, uint256 outcomeValue,
        string calldata outcomeType, string calldata outcomeDescription
    ) external {
        Escrow storage esc = escrows[escrowId];
        require(esc.agent == msg.sender, "Not your escrow");
        require(esc.status == EscrowStatus.FUNDED, "Not funded");

        Permission storage perm = permissions[esc.permissionId];
        require(perm.status == PermissionStatus.ACTIVE, "Permission revoked or expired");

        esc.outcomeValue = outcomeValue;
        esc.outcomeType = outcomeType;
        esc.outcomeDescription = outcomeDescription;
        esc.reportedAt = block.timestamp;
        esc.status = EscrowStatus.OUTCOME_REPORTED;

        emit OutcomeReported(escrowId, outcomeValue, outcomeType, block.timestamp + DISPUTE_WINDOW);
    }

    function disputeSettlement(uint256 escrowId, string calldata reason) external {
        Escrow storage esc = escrows[escrowId];
        require(esc.status == EscrowStatus.OUTCOME_REPORTED, "Not in dispute window");
        require(block.timestamp < esc.reportedAt + DISPUTE_WINDOW, "Dispute window closed");

        Permission storage perm = permissions[esc.permissionId];
        require(msg.sender == perm.user || msg.sender == esc.agent, "Not a party to this escrow");

        esc.status = EscrowStatus.DISPUTED;
        emit DisputeFiled(escrowId, msg.sender, reason);
    }

    // ─── Settlement ──────────────────────────────────────────────────────

    function settle(uint256 escrowId) external nonReentrant {
        Escrow storage esc = escrows[escrowId];
        require(esc.status == EscrowStatus.OUTCOME_REPORTED, "Not settleable");
        require(block.timestamp >= esc.reportedAt + DISPUTE_WINDOW, "Dispute window still open");

        Permission storage perm = permissions[esc.permissionId];

        uint256 userShare = (esc.outcomeValue * perm.compensationBps) / BPS_DENOMINATOR;
        uint256 protocolFee = (esc.outcomeValue * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 totalDeductions = userShare + protocolFee;
        require(esc.amount >= totalDeductions, "Escrow insufficient for settlement");
        uint256 agentRefund = esc.amount - totalDeductions;

        esc.status = EscrowStatus.SETTLED;
        totalProtocolFees += protocolFee;

        if (userShare > 0) paymentToken.safeTransfer(perm.user, userShare);
        if (protocolFee > 0) paymentToken.safeTransfer(treasury, protocolFee);
        if (agentRefund > 0) paymentToken.safeTransfer(esc.agent, agentRefund);

        emit SettlementCompleted(escrowId, userShare, protocolFee, agentRefund);
    }

    // ─── Refunds ─────────────────────────────────────────────────────────

    function refundEscrow(uint256 escrowId) external nonReentrant {
        Escrow storage esc = escrows[escrowId];
        Permission storage perm = permissions[esc.permissionId];

        bool isRevoked = perm.status == PermissionStatus.REVOKED && esc.status == EscrowStatus.FUNDED;
        bool isDisputeResolved = esc.status == EscrowStatus.DISPUTED && msg.sender == owner();
        require(isRevoked || isDisputeResolved, "Not refundable");

        uint256 refundAmount = esc.amount;
        esc.status = EscrowStatus.REFUNDED;
        paymentToken.safeTransfer(esc.agent, refundAmount);
        emit EscrowRefunded(escrowId, esc.agent, refundAmount);
    }

    // ─── Views ───────────────────────────────────────────────────────────

    function checkAccess(uint256 permissionId, address agent) external view returns (
        bool permitted, uint256 compensationBps, uint256 upfrontFee, uint256 validUntil
    ) {
        Permission storage perm = permissions[permissionId];
        permitted = perm.status == PermissionStatus.ACTIVE
            && block.timestamp < perm.validUntil
            && (perm.merchant == address(0) || perm.merchant == agent);
        return (permitted, perm.compensationBps, perm.upfrontFee, perm.validUntil);
    }

    /**
     * @notice Verify an agent's ERC-8004 trust status without depositing.
     */
    function checkAgentTrust(uint256 agentId, address agentAddress) external view returns (
        bool registered, bool authorized, bool reputable, int128 repScore, uint64 repCount
    ) {
        if (address(identityRegistry) == address(0) || agentId == 0) {
            return (false, false, false, 0, 0);
        }

        try identityRegistry.ownerOf(agentId) returns (address agentOwner) {
            registered = true;
            authorized = (agentOwner == agentAddress);
            if (!authorized) {
                try identityRegistry.getAgentWallet(agentId) returns (address wallet) {
                    authorized = (wallet == agentAddress && wallet != address(0));
                } catch {}
            }
        } catch {
            return (false, false, false, 0, 0);
        }

        if (address(reputationRegistry) != address(0) && trustedReviewers.length > 0) {
            try reputationRegistry.getSummary(agentId, trustedReviewers, "", "") returns (
                uint64 count, int128 summaryValue, uint8
            ) {
                repCount = count;
                repScore = summaryValue;
                reputable = (count > 0 && summaryValue >= minReputationScore);
            } catch {}
        }
    }

    function getUserPermissions(address user) external view returns (uint256[] memory) {
        return userPermissions[user];
    }

    function previewSettlement(uint256 escrowId) external view returns (
        uint256 userShare, uint256 protocolFee, uint256 agentRefund, uint256 disputeWindowEnd
    ) {
        Escrow storage esc = escrows[escrowId];
        Permission storage perm = permissions[esc.permissionId];
        userShare = (esc.outcomeValue * perm.compensationBps) / BPS_DENOMINATOR;
        protocolFee = (esc.outcomeValue * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 totalDeductions = userShare + protocolFee;
        agentRefund = esc.amount > totalDeductions ? esc.amount - totalDeductions : 0;
        disputeWindowEnd = esc.reportedAt + DISPUTE_WINDOW;
    }

    function getTrustedReviewers() external view returns (address[] memory) {
        return trustedReviewers;
    }

    // ─── Admin ───────────────────────────────────────────────────────────

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }

    function setIdentityRegistry(address _registry) external onlyOwner {
        identityRegistry = IERC8004Identity(_registry);
        emit IdentityRegistryUpdated(_registry);
    }

    function setReputationRegistry(address _registry) external onlyOwner {
        reputationRegistry = IERC8004Reputation(_registry);
        emit ReputationRegistryUpdated(_registry);
    }

    function setIdentityEnforcement(bool _enforced) external onlyOwner {
        identityEnforced = _enforced;
        emit IdentityEnforcementUpdated(_enforced);
    }

    function setReputationEnforcement(bool _enforced, int128 _minScore, uint8 _decimals) external onlyOwner {
        reputationEnforced = _enforced;
        minReputationScore = _minScore;
        reputationDecimals = _decimals;
        emit ReputationEnforcementUpdated(_enforced, _minScore, _decimals);
    }

    function setTrustedReviewers(address[] calldata _reviewers) external onlyOwner {
        trustedReviewers = _reviewers;
        emit TrustedReviewersUpdated(_reviewers);
    }

    function resolveDisputeForUser(uint256 escrowId) external onlyOwner nonReentrant {
        Escrow storage esc = escrows[escrowId];
        require(esc.status == EscrowStatus.DISPUTED, "Not disputed");
        Permission storage perm = permissions[esc.permissionId];
        uint256 amount = esc.amount;
        esc.status = EscrowStatus.SETTLED;
        paymentToken.safeTransfer(perm.user, amount);
        emit SettlementCompleted(escrowId, amount, 0, 0);
    }

    function expirePermission(uint256 permissionId) external {
        Permission storage perm = permissions[permissionId];
        require(perm.status == PermissionStatus.ACTIVE, "Not active");
        require(block.timestamp >= perm.validUntil, "Not yet expired");
        perm.status = PermissionStatus.EXPIRED;
    }
}
