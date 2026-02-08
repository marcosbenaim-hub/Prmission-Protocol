// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IERC8004Identity.sol";
import "./interfaces/IERC8004Reputation.sol";

/**
 * @title Prmission Protocol V2
 * @notice Consent-gated data exchange with atomic escrow settlement
 *         and ERC-8004 trust verification.
 *
 * V2 Changes (from audit):
 *   - User share calculated from escrowed amount, not agent-reported outcome
 *   - outcomeValue capped at escrow amount (prevents fund lock)
 *   - Flexible dispute resolution with partial splits
 *   - Outcome reporting allowed on revoked permissions (escrow already committed)
 *   - Settle restricted to involved parties
 *   - Permission expiry auto-detected in revoke flow
 *   - Trusted reviewers array capped at 50
 *   - Pausable emergency stop
 *   - Token rescue for accidental sends
 *   - Pagination on user permissions
 *   - Events on all state changes
 *   - Multiple escrow tracking per permission
 *   - Grace period enforcement on revocation
 */
contract PrmissionV2 is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // ─── Constants ───────────────────────────────────────────────────────

    uint256 public constant PROTOCOL_FEE_BPS = 300;          // 3%
    uint256 public constant BPS_DENOMINATOR  = 10_000;
    uint256 public constant DISPUTE_WINDOW   = 24 hours;
    uint256 public constant REVOCATION_GRACE = 60 seconds;
    uint256 public constant MAX_REVIEWERS    = 50;
    uint256 public constant MAX_COMPENSATION_BPS = 5000;      // 50% max

    // ─── Payment token (USDC on Base) ────────────────────────────────────

    IERC20 public immutable paymentToken;

    // ─── Protocol treasury ───────────────────────────────────────────────

    address public treasury;

    // ─── ERC-8004 Registries ─────────────────────────────────────────────

    IERC8004Identity   public identityRegistry;
    IERC8004Reputation public reputationRegistry;

    int128 public minReputationScore;
    uint8  public reputationDecimals;
    bool   public identityEnforced;
    bool   public reputationEnforced;
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
        uint256 compensationBps;    // User's cut of the escrow amount
        uint256 upfrontFee;         // Paid immediately on escrow deposit
        uint256 validUntil;
        PermissionStatus status;
        uint256 createdAt;
        uint256 revokedAt;          // V2: track revocation time for grace period
    }

    struct Escrow {
        uint256 permissionId;
        address agent;
        uint256 agentId;            // ERC-8004 agent ID (0 if not enforced)
        uint256 amount;             // V2: This is now the basis for all payouts
        uint256 outcomeValue;       // V2: Informational only, capped at amount
        string  outcomeType;
        string  outcomeDescription;
        uint256 reportedAt;
        EscrowStatus status;
        uint256 createdAt;
    }

    // ─── Storage ─────────────────────────────────────────────────────────

    uint256 public nextPermissionId = 1;
    uint256 public nextEscrowId = 1;

    mapping(uint256 => Permission)   public permissions;
    mapping(uint256 => Escrow)       public escrows;
    mapping(address => uint256[])    public userPermissions;
    mapping(uint256 => uint256[])    public permissionEscrows;  // V2: track escrows per permission

    uint256 public totalProtocolFees;       // Cumulative fees sent to treasury
    uint256 public totalSettledVolume;       // V2: Cumulative escrow volume settled

    // ─── Events ──────────────────────────────────────────────────────────

    event PermissionGranted(
        uint256 indexed permissionId, address indexed user, address indexed merchant,
        string dataCategory, string purpose, uint256 compensationBps,
        uint256 upfrontFee, uint256 validUntil
    );
    event PermissionRevoked(
        uint256 indexed permissionId, address indexed user,
        uint256 revokedAt, uint256 graceEndsAt
    );
    event PermissionExpired(uint256 indexed permissionId);   // V2

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
    event DisputeResolved(                                   // V2
        uint256 indexed escrowId, uint256 userShare,
        uint256 protocolFee, uint256 agentRefund
    );
    event EscrowRefunded(uint256 indexed escrowId, address indexed agent, uint256 amount);
    event TokensRescued(address indexed token, uint256 amount);  // V2

    // ERC-8004 config events
    event IdentityRegistryUpdated(address indexed registry);
    event ReputationRegistryUpdated(address indexed registry);
    event IdentityEnforcementUpdated(bool enforced);
    event ReputationEnforcementUpdated(bool enforced, int128 minScore, uint8 decimals);
    event TrustedReviewersUpdated(address[] reviewers);
    event TreasuryUpdated(address indexed newTreasury);      // V2

    // ─── Errors ──────────────────────────────────────────────────────────
    // V2: Custom errors save gas vs require strings

    error InvalidAddress();
    error EmptyString();
    error ZeroValue();
    error NotPermissionOwner();
    error PermissionNotActive();
    error PermissionExpiredErr();
    error NotAuthorizedMerchant();
    error NotEscrowAgent();
    error EscrowNotFunded();
    error EscrowNotSettleable();
    error DisputeWindowOpen();
    error DisputeWindowClosed();
    error NotPartyToEscrow();
    error NotDisputed();
    error NotRefundable();
    error IdentityRegistryNotSet();
    error AgentIdRequired();
    error NotAgentOwnerOrWallet();
    error ReputationRegistryNotSet();
    error NoTrustedReviewers();
    error AgentNoReputation();
    error AgentBelowMinReputation();
    error TooManyReviewers();
    error CompensationTooHigh();

    // ─── Constructor ─────────────────────────────────────────────────────

    constructor(address _paymentToken, address _treasury) Ownable(msg.sender) {
        if (_paymentToken == address(0)) revert InvalidAddress();
        if (_treasury == address(0)) revert InvalidAddress();
        paymentToken = IERC20(_paymentToken);
        treasury = _treasury;
    }

    // ─── Permission Management ───────────────────────────────────────────

    /**
     * @notice User grants an agent/merchant permission to access their data.
     * @param merchant       Specific agent address, or address(0) for open access
     * @param dataCategory   What data is being shared (e.g., "browsing_history")
     * @param purpose        Why the data is needed (e.g., "ad_targeting")
     * @param compensationBps User's share in basis points (max 5000 = 50%)
     * @param upfrontFee     Flat fee paid to user when escrow is deposited
     * @param validityPeriod How long the permission lasts (seconds)
     * @dev merchant=address(0) means ANY agent can use this permission.
     *      Users should understand this before granting open permissions.
     */
    function grantPermission(
        address merchant,
        string calldata dataCategory,
        string calldata purpose,
        uint256 compensationBps,
        uint256 upfrontFee,
        uint256 validityPeriod
    ) external whenNotPaused returns (uint256 permissionId) {
        if (bytes(dataCategory).length == 0) revert EmptyString();
        if (bytes(purpose).length == 0) revert EmptyString();
        if (validityPeriod == 0) revert ZeroValue();
        if (compensationBps > MAX_COMPENSATION_BPS) revert CompensationTooHigh();

        permissionId = nextPermissionId++;
        uint256 validUntil = block.timestamp + validityPeriod;

        permissions[permissionId] = Permission({
            user: msg.sender,
            merchant: merchant,
            dataCategory: dataCategory,
            purpose: purpose,
            compensationBps: compensationBps,
            upfrontFee: upfrontFee,
            validUntil: validUntil,
            status: PermissionStatus.ACTIVE,
            createdAt: block.timestamp,
            revokedAt: 0
        });
        userPermissions[msg.sender].push(permissionId);

        emit PermissionGranted(
            permissionId, msg.sender, merchant, dataCategory, purpose,
            compensationBps, upfrontFee, validUntil
        );
    }

    /**
     * @notice User revokes a permission. Active escrows within grace period
     *         can still complete. After grace, funded escrows become refundable.
     */
    function revokePermission(uint256 permissionId) external {
        Permission storage perm = permissions[permissionId];
        if (perm.user != msg.sender) revert NotPermissionOwner();
        if (perm.status != PermissionStatus.ACTIVE) revert PermissionNotActive();

        // V2: Auto-detect expiry
        if (block.timestamp >= perm.validUntil) {
            perm.status = PermissionStatus.EXPIRED;
            emit PermissionExpired(permissionId);
            return;
        }

        perm.status = PermissionStatus.REVOKED;
        perm.revokedAt = block.timestamp;

        emit PermissionRevoked(
            permissionId, msg.sender,
            block.timestamp, block.timestamp + REVOCATION_GRACE
        );
    }

    // ─── Escrow (with ERC-8004 verification) ─────────────────────────────

    /**
     * @notice Agent deposits escrow to access user data.
     * @param permissionId  The permission being exercised
     * @param amount        Total escrow amount (basis for all payouts)
     * @param agentId       The agent's ERC-8004 token ID (pass 0 if identity not enforced)
     * @dev The user's payout = amount * compensationBps / 10000
     *      Protocol fee = amount * 300 / 10000 (3%)
     *      Agent gets back the remainder
     */
    function depositEscrow(
        uint256 permissionId,
        uint256 amount,
        uint256 agentId
    ) external nonReentrant whenNotPaused returns (uint256 escrowId) {
        Permission storage perm = permissions[permissionId];

        if (perm.status != PermissionStatus.ACTIVE) revert PermissionNotActive();
        if (block.timestamp >= perm.validUntil) revert PermissionExpiredErr();
        if (perm.merchant != address(0) && perm.merchant != msg.sender) revert NotAuthorizedMerchant();
        if (amount == 0) revert ZeroValue();

        // V2: Sanity check — escrow must cover at minimum the user share + protocol fee
        uint256 minRequired = (amount * (perm.compensationBps + PROTOCOL_FEE_BPS)) / BPS_DENOMINATOR;
        require(amount >= minRequired, "Escrow math: compensationBps + fee > 100%");

        // ─── ERC-8004 Identity Verification ───
        if (identityEnforced) {
            if (address(identityRegistry) == address(0)) revert IdentityRegistryNotSet();
            if (agentId == 0) revert AgentIdRequired();

            address agentOwner = identityRegistry.ownerOf(agentId);
            bool isOwner = (agentOwner == msg.sender);

            bool isWallet = false;
            try identityRegistry.getAgentWallet(agentId) returns (address wallet) {
                isWallet = (wallet == msg.sender && wallet != address(0));
            } catch {}

            if (!isOwner && !isWallet) revert NotAgentOwnerOrWallet();
        }

        // ─── ERC-8004 Reputation Gating ───
        if (reputationEnforced && identityEnforced) {
            if (address(reputationRegistry) == address(0)) revert ReputationRegistryNotSet();
            if (trustedReviewers.length == 0) revert NoTrustedReviewers();

            (uint64 count, int128 summaryValue, ) = reputationRegistry.getSummary(
                agentId, trustedReviewers, "", ""
            );
            if (count == 0) revert AgentNoReputation();
            if (summaryValue < minReputationScore) revert AgentBelowMinReputation();
        }

        // Pay upfront fee directly to user
        if (perm.upfrontFee > 0) {
            paymentToken.safeTransferFrom(msg.sender, perm.user, perm.upfrontFee);
        }

        // Lock escrow
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);

        escrowId = nextEscrowId++;
        escrows[escrowId] = Escrow({
            permissionId: permissionId,
            agent: msg.sender,
            agentId: agentId,
            amount: amount,
            outcomeValue: 0,
            outcomeType: "",
            outcomeDescription: "",
            reportedAt: 0,
            status: EscrowStatus.FUNDED,
            createdAt: block.timestamp
        });

        // V2: Track escrows per permission
        permissionEscrows[permissionId].push(escrowId);

        emit EscrowDeposited(escrowId, permissionId, msg.sender, agentId, amount);
    }

    // ─── Outcome & Dispute ───────────────────────────────────────────────

    /**
     * @notice Agent reports the outcome of data usage.
     * @param outcomeValue       Informational value (capped at escrow amount).
     *                           Payouts are based on esc.amount, NOT this value.
     * @param outcomeType        Category of outcome (e.g., "conversion", "impression")
     * @param outcomeDescription Human-readable description
     * @dev V2: No longer requires permission to be ACTIVE. The escrow was funded
     *      when the permission was active — the economic commitment stands.
     */
    function reportOutcome(
        uint256 escrowId,
        uint256 outcomeValue,
        string calldata outcomeType,
        string calldata outcomeDescription
    ) external {
        Escrow storage esc = escrows[escrowId];
        if (esc.agent != msg.sender) revert NotEscrowAgent();
        if (esc.status != EscrowStatus.FUNDED) revert EscrowNotFunded();

        // V2: Cap outcomeValue at escrow amount (informational only, prevents confusion)
        uint256 cappedOutcome = outcomeValue > esc.amount ? esc.amount : outcomeValue;

        esc.outcomeValue = cappedOutcome;
        esc.outcomeType = outcomeType;
        esc.outcomeDescription = outcomeDescription;
        esc.reportedAt = block.timestamp;
        esc.status = EscrowStatus.OUTCOME_REPORTED;

        emit OutcomeReported(escrowId, cappedOutcome, outcomeType, block.timestamp + DISPUTE_WINDOW);
    }

    /**
     * @notice Either party files a dispute during the 24-hour window.
     */
    function disputeSettlement(uint256 escrowId, string calldata reason) external {
        Escrow storage esc = escrows[escrowId];
        if (esc.status != EscrowStatus.OUTCOME_REPORTED) revert EscrowNotSettleable();
        if (block.timestamp >= esc.reportedAt + DISPUTE_WINDOW) revert DisputeWindowClosed();

        Permission storage perm = permissions[esc.permissionId];
        if (msg.sender != perm.user && msg.sender != esc.agent) revert NotPartyToEscrow();

        esc.status = EscrowStatus.DISPUTED;
        emit DisputeFiled(escrowId, msg.sender, reason);
    }

    // ─── Settlement ──────────────────────────────────────────────────────

    /**
     * @notice Settle an escrow after the dispute window.
     * @dev V2: Payouts calculated from esc.amount (not outcomeValue).
     *      Restricted to involved parties + owner.
     *
     *      userShare   = esc.amount * compensationBps / 10000
     *      protocolFee = esc.amount * 300 / 10000
     *      agentRefund = esc.amount - userShare - protocolFee
     */
    function settle(uint256 escrowId) external nonReentrant whenNotPaused {
        Escrow storage esc = escrows[escrowId];
        if (esc.status != EscrowStatus.OUTCOME_REPORTED) revert EscrowNotSettleable();
        if (block.timestamp < esc.reportedAt + DISPUTE_WINDOW) revert DisputeWindowOpen();

        Permission storage perm = permissions[esc.permissionId];

        // V2: Restrict caller
        require(
            msg.sender == esc.agent || msg.sender == perm.user || msg.sender == owner(),
            "Not authorized to settle"
        );

        // V2: Calculate from escrowed amount — no agent gaming possible
        uint256 userShare   = (esc.amount * perm.compensationBps) / BPS_DENOMINATOR;
        uint256 protocolFee = (esc.amount * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 agentRefund = esc.amount - userShare - protocolFee;

        esc.status = EscrowStatus.SETTLED;
        totalProtocolFees  += protocolFee;
        totalSettledVolume += esc.amount;

        if (userShare > 0)   paymentToken.safeTransfer(perm.user, userShare);
        if (protocolFee > 0) paymentToken.safeTransfer(treasury, protocolFee);
        if (agentRefund > 0) paymentToken.safeTransfer(esc.agent, agentRefund);

        emit SettlementCompleted(escrowId, userShare, protocolFee, agentRefund);
    }

    // ─── Refunds ─────────────────────────────────────────────────────────

    /**
     * @notice Refund escrow when permission is revoked (after grace) or dispute resolved by owner.
     */
    function refundEscrow(uint256 escrowId) external nonReentrant {
        Escrow storage esc = escrows[escrowId];
        Permission storage perm = permissions[esc.permissionId];

        bool isRevoked = perm.status == PermissionStatus.REVOKED
            && esc.status == EscrowStatus.FUNDED
            && block.timestamp >= perm.revokedAt + REVOCATION_GRACE;  // V2: enforce grace

        bool isDisputeRefund = esc.status == EscrowStatus.DISPUTED && msg.sender == owner();

        // V2: Also allow refund on OUTCOME_REPORTED if permission revoked (prevents fund lock)
        bool isRevokedAfterOutcome = perm.status == PermissionStatus.REVOKED
            && esc.status == EscrowStatus.OUTCOME_REPORTED
            && msg.sender == owner();

        require(isRevoked || isDisputeRefund || isRevokedAfterOutcome, "Not refundable");

        uint256 refundAmount = esc.amount;
        esc.status = EscrowStatus.REFUNDED;
        paymentToken.safeTransfer(esc.agent, refundAmount);

        emit EscrowRefunded(escrowId, esc.agent, refundAmount);
    }

    // ─── Dispute Resolution (V2: Flexible) ───────────────────────────────

    /**
     * @notice Owner resolves a dispute with a flexible split.
     * @param escrowId    The disputed escrow
     * @param userBps     User's share in basis points (0-10000)
     * @dev protocolFee is always taken. Remainder goes to agent.
     *      Example: userBps=5000 → user gets 50%, protocol gets 3%, agent gets 47%
     *      Example: userBps=10000 → user gets 97%, protocol gets 3%, agent gets 0%
     *      Example: userBps=0 → user gets 0%, protocol gets 3%, agent gets 97%
     */
    function resolveDispute(
        uint256 escrowId,
        uint256 userBps
    ) external onlyOwner nonReentrant {
        require(userBps <= BPS_DENOMINATOR, "userBps exceeds 100%");

        Escrow storage esc = escrows[escrowId];
        if (esc.status != EscrowStatus.DISPUTED) revert NotDisputed();

        Permission storage perm = permissions[esc.permissionId];

        uint256 protocolFee = (esc.amount * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 distributable = esc.amount - protocolFee;
        uint256 userShare = (distributable * userBps) / BPS_DENOMINATOR;
        uint256 agentRefund = distributable - userShare;

        esc.status = EscrowStatus.SETTLED;
        totalProtocolFees  += protocolFee;
        totalSettledVolume += esc.amount;

        if (userShare > 0)   paymentToken.safeTransfer(perm.user, userShare);
        if (protocolFee > 0) paymentToken.safeTransfer(treasury, protocolFee);
        if (agentRefund > 0) paymentToken.safeTransfer(esc.agent, agentRefund);

        emit DisputeResolved(escrowId, userShare, protocolFee, agentRefund);
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

    /**
     * @notice V2: Paginated user permissions.
     */
    function getUserPermissions(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory result) {
        uint256[] storage all = userPermissions[user];
        if (offset >= all.length) return new uint256[](0);

        uint256 end = offset + limit;
        if (end > all.length) end = all.length;
        uint256 count = end - offset;

        result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = all[offset + i];
        }
    }

    /**
     * @notice V2: Get all escrow IDs for a permission.
     */
    function getPermissionEscrows(uint256 permissionId) external view returns (uint256[] memory) {
        return permissionEscrows[permissionId];
    }

    /**
     * @notice V2: Get total number of permissions for a user.
     */
    function getUserPermissionCount(address user) external view returns (uint256) {
        return userPermissions[user].length;
    }

    function previewSettlement(uint256 escrowId) external view returns (
        uint256 userShare, uint256 protocolFee, uint256 agentRefund, uint256 disputeWindowEnd
    ) {
        Escrow storage esc = escrows[escrowId];
        Permission storage perm = permissions[esc.permissionId];

        // V2: Calculate from amount, not outcomeValue
        userShare   = (esc.amount * perm.compensationBps) / BPS_DENOMINATOR;
        protocolFee = (esc.amount * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        agentRefund = esc.amount - userShare - protocolFee;
        disputeWindowEnd = esc.reportedAt + DISPUTE_WINDOW;
    }

    function getTrustedReviewers() external view returns (address[] memory) {
        return trustedReviewers;
    }

    // ─── Admin ───────────────────────────────────────────────────────────

    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert InvalidAddress();
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
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
        if (_reviewers.length > MAX_REVIEWERS) revert TooManyReviewers();
        trustedReviewers = _reviewers;
        emit TrustedReviewersUpdated(_reviewers);
    }

    /**
     * @notice Mark an expired permission. Anyone can call.
     */
    function expirePermission(uint256 permissionId) external {
        Permission storage perm = permissions[permissionId];
        if (perm.status != PermissionStatus.ACTIVE) revert PermissionNotActive();
        require(block.timestamp >= perm.validUntil, "Not yet expired");
        perm.status = PermissionStatus.EXPIRED;
        emit PermissionExpired(permissionId);
    }

    // ─── Emergency ───────────────────────────────────────────────────────

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice V2: Rescue accidentally sent tokens (not the payment token).
     */
    function rescueTokens(address token, uint256 amount) external onlyOwner {
        require(token != address(paymentToken), "Cannot rescue payment token");
        IERC20(token).safeTransfer(treasury, amount);
        emit TokensRescued(token, amount);
    }
}
