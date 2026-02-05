// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Prmission Protocol
 * @notice Consent-gated data exchange with atomic escrow settlement.
 *         3% protocol fee on every transaction. Non-negotiable.
 *
 * Flow:
 *   1. User grants permission  → grantPermission()
 *   2. Agent deposits escrow   → depositEscrow()
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

    // ─── Constants ───────────────────────────────────────────────────────────

    uint256 public constant PROTOCOL_FEE_BPS = 300;       // 3% = 300 basis points
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant DISPUTE_WINDOW = 24 hours;
    uint256 public constant REVOCATION_GRACE = 60 seconds; // data must be deleted within this

    // ─── Payment token (USDC on Base) ────────────────────────────────────────

    IERC20 public immutable paymentToken;

    // ─── Protocol treasury ───────────────────────────────────────────────────

    address public treasury;

    // ─── Enums ───────────────────────────────────────────────────────────────

    enum PermissionStatus { INACTIVE, ACTIVE, REVOKED, EXPIRED }
    enum EscrowStatus     { NONE, FUNDED, OUTCOME_REPORTED, DISPUTED, SETTLED, REFUNDED }

    // ─── Data Objects (from spec §4) ─────────────────────────────────────────

    struct Permission {
        address user;               // data owner
        address merchant;           // who can access (address(0) = any agent)
        string  dataCategory;       // e.g. "travel_preferences"
        string  purpose;            // e.g. "personalized_offer"
        uint256 compensationBps;    // user's cut in basis points (e.g. 200 = 2%)
        uint256 upfrontFee;         // fixed fee per access in payment token units
        uint256 validUntil;         // unix timestamp
        PermissionStatus status;
        uint256 createdAt;
    }

    struct Escrow {
        uint256 permissionId;
        address agent;              // who deposited
        uint256 amount;             // total escrowed
        uint256 outcomeValue;       // reported transaction value
        string  outcomeType;        // "booking", "purchase", etc.
        string  outcomeDescription;
        uint256 reportedAt;         // when outcome was reported
        EscrowStatus status;
        uint256 createdAt;
    }

    // ─── Storage ─────────────────────────────────────────────────────────────

    uint256 public nextPermissionId = 1;
    uint256 public nextEscrowId = 1;

    mapping(uint256 => Permission) public permissions;
    mapping(uint256 => Escrow)     public escrows;

    // user → permissionId[]
    mapping(address => uint256[]) public userPermissions;

    // tracking total protocol fees collected
    uint256 public totalProtocolFees;

    // ─── Events ──────────────────────────────────────────────────────────────

    event PermissionGranted(
        uint256 indexed permissionId,
        address indexed user,
        address indexed merchant,
        string  dataCategory,
        string  purpose,
        uint256 compensationBps,
        uint256 upfrontFee,
        uint256 validUntil
    );

    event PermissionRevoked(
        uint256 indexed permissionId,
        address indexed user,
        uint256 revokedAt,
        uint256 deleteBy       // must delete data by this timestamp
    );

    event EscrowDeposited(
        uint256 indexed escrowId,
        uint256 indexed permissionId,
        address indexed agent,
        uint256 amount
    );

    event OutcomeReported(
        uint256 indexed escrowId,
        uint256 outcomeValue,
        string  outcomeType,
        uint256 disputeWindowEnd
    );

    event SettlementCompleted(
        uint256 indexed escrowId,
        uint256 userShare,
        uint256 protocolFee,
        uint256 agentRefund
    );

    event DisputeFiled(
        uint256 indexed escrowId,
        address indexed disputant,
        string  reason
    );

    event EscrowRefunded(
        uint256 indexed escrowId,
        address indexed agent,
        uint256 amount
    );

    // ─── Constructor ─────────────────────────────────────────────────────────

    /**
     * @param _paymentToken USDC address on Base (or any ERC-20)
     * @param _treasury     Address that receives the 3% protocol fee
     */
    constructor(address _paymentToken, address _treasury) Ownable(msg.sender) {
        require(_paymentToken != address(0), "Invalid token");
        require(_treasury != address(0), "Invalid treasury");
        paymentToken = IERC20(_paymentToken);
        treasury = _treasury;
    }

    // ─── Permission Management ───────────────────────────────────────────────

    /**
     * @notice User grants permission for a specific data category and purpose.
     *         Spec §3.1: EXPLICIT-GRANT, GRANULAR-SCOPE
     */
    function grantPermission(
        address merchant,
        string calldata dataCategory,
        string calldata purpose,
        uint256 compensationBps,
        uint256 upfrontFee,
        uint256 validityPeriod
    ) external returns (uint256 permissionId) {
        require(bytes(dataCategory).length > 0, "Empty category");
        require(bytes(purpose).length > 0, "Empty purpose");
        require(validityPeriod > 0, "Zero validity");
        require(compensationBps <= 5000, "Max 50% compensation"); // sanity cap

        permissionId = nextPermissionId++;

        permissions[permissionId] = Permission({
            user: msg.sender,
            merchant: merchant,
            dataCategory: dataCategory,
            purpose: purpose,
            compensationBps: compensationBps,
            upfrontFee: upfrontFee,
            validUntil: block.timestamp + validityPeriod,
            status: PermissionStatus.ACTIVE,
            createdAt: block.timestamp
        });

        userPermissions[msg.sender].push(permissionId);

        emit PermissionGranted(
            permissionId,
            msg.sender,
            merchant,
            dataCategory,
            purpose,
            compensationBps,
            upfrontFee,
            block.timestamp + validityPeriod
        );
    }

    /**
     * @notice User revokes a permission. Spec §3.1: REVOCABLE-ANYTIME
     *         Data must be deleted within 60 seconds (off-chain enforcement).
     */
    function revokePermission(uint256 permissionId) external {
        Permission storage perm = permissions[permissionId];
        require(perm.user == msg.sender, "Not your permission");
        require(perm.status == PermissionStatus.ACTIVE, "Not active");

        perm.status = PermissionStatus.REVOKED;

        emit PermissionRevoked(
            permissionId,
            msg.sender,
            block.timestamp,
            block.timestamp + REVOCATION_GRACE
        );
    }

    // ─── Escrow ──────────────────────────────────────────────────────────────

    /**
     * @notice Agent deposits escrow to access user data.
     *         Spec §3.2: IN-TRANSACTION, ATOMIC-SETTLEMENT
     *
     * @param permissionId  The permission being exercised
     * @param amount        Total escrow amount (must cover user share + 3% + upfront fee)
     */
    function depositEscrow(
        uint256 permissionId,
        uint256 amount
    ) external nonReentrant returns (uint256 escrowId) {
        Permission storage perm = permissions[permissionId];

        require(perm.status == PermissionStatus.ACTIVE, "Permission not active");
        require(block.timestamp < perm.validUntil, "Permission expired");
        require(
            perm.merchant == address(0) || perm.merchant == msg.sender,
            "Not authorized merchant"
        );
        require(amount > 0, "Zero escrow");

        // Pay upfront fee directly to user if required
        if (perm.upfrontFee > 0) {
            paymentToken.safeTransferFrom(msg.sender, perm.user, perm.upfrontFee);
        }

        // Lock escrow
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);

        escrowId = nextEscrowId++;

        escrows[escrowId] = Escrow({
            permissionId: permissionId,
            agent: msg.sender,
            amount: amount,
            outcomeValue: 0,
            outcomeType: "",
            outcomeDescription: "",
            reportedAt: 0,
            status: EscrowStatus.FUNDED,
            createdAt: block.timestamp
        });

        emit EscrowDeposited(escrowId, permissionId, msg.sender, amount);
    }

    /**
     * @notice Agent reports the outcome of what they did with the data.
     *         Starts the 24-hour dispute window.
     *         Spec §5.1 step 6, §3.2: TRANSPARENT-PRICING
     */
    function reportOutcome(
        uint256 escrowId,
        uint256 outcomeValue,
        string calldata outcomeType,
        string calldata outcomeDescription
    ) external {
        Escrow storage esc = escrows[escrowId];
        require(esc.agent == msg.sender, "Not your escrow");
        require(esc.status == EscrowStatus.FUNDED, "Not funded");

        // Verify permission is still valid
        Permission storage perm = permissions[esc.permissionId];
        require(
            perm.status == PermissionStatus.ACTIVE,
            "Permission revoked or expired"
        );

        esc.outcomeValue = outcomeValue;
        esc.outcomeType = outcomeType;
        esc.outcomeDescription = outcomeDescription;
        esc.reportedAt = block.timestamp;
        esc.status = EscrowStatus.OUTCOME_REPORTED;

        emit OutcomeReported(
            escrowId,
            outcomeValue,
            outcomeType,
            block.timestamp + DISPUTE_WINDOW
        );
    }

    /**
     * @notice Either party files a dispute during the 24-hour window.
     *         Spec §5.2: Dispute Path
     */
    function disputeSettlement(uint256 escrowId, string calldata reason) external {
        Escrow storage esc = escrows[escrowId];
        require(esc.status == EscrowStatus.OUTCOME_REPORTED, "Not in dispute window");
        require(
            block.timestamp < esc.reportedAt + DISPUTE_WINDOW,
            "Dispute window closed"
        );

        Permission storage perm = permissions[esc.permissionId];
        require(
            msg.sender == perm.user || msg.sender == esc.agent,
            "Not a party to this escrow"
        );

        esc.status = EscrowStatus.DISPUTED;

        emit DisputeFiled(escrowId, msg.sender, reason);
    }

    /**
     * @notice Settle the escrow after the dispute window has passed.
     *         Anyone can call this (permissionless settlement).
     *
     *         Split:
     *           - User gets (outcomeValue × compensationBps / 10000)
     *           - Protocol gets (outcomeValue × 300 / 10000) = 3%
     *           - Agent gets remainder of escrowed amount
     *
     *         Spec §3.2: DIRECT-COMPENSATION, ATOMIC-SETTLEMENT, NO-HIDDEN-FEES
     */
    function settle(uint256 escrowId) external nonReentrant {
        Escrow storage esc = escrows[escrowId];
        require(esc.status == EscrowStatus.OUTCOME_REPORTED, "Not settleable");
        require(
            block.timestamp >= esc.reportedAt + DISPUTE_WINDOW,
            "Dispute window still open"
        );

        Permission storage perm = permissions[esc.permissionId];

        // Calculate splits
        uint256 userShare = (esc.outcomeValue * perm.compensationBps) / BPS_DENOMINATOR;
        uint256 protocolFee = (esc.outcomeValue * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;

        uint256 totalDeductions = userShare + protocolFee;
        require(esc.amount >= totalDeductions, "Escrow insufficient for settlement");

        uint256 agentRefund = esc.amount - totalDeductions;

        // Execute atomic settlement
        esc.status = EscrowStatus.SETTLED;
        totalProtocolFees += protocolFee;

        // Transfer user share
        if (userShare > 0) {
            paymentToken.safeTransfer(perm.user, userShare);
        }

        // Transfer protocol fee (the 3%)
        if (protocolFee > 0) {
            paymentToken.safeTransfer(treasury, protocolFee);
        }

        // Return remainder to agent
        if (agentRefund > 0) {
            paymentToken.safeTransfer(esc.agent, agentRefund);
        }

        emit SettlementCompleted(escrowId, userShare, protocolFee, agentRefund);
    }

    // ─── Refunds ─────────────────────────────────────────────────────────────

    /**
     * @notice Refund escrow if permission was revoked before outcome,
     *         or if a dispute is resolved in the agent's favor (owner-only).
     */
    function refundEscrow(uint256 escrowId) external nonReentrant {
        Escrow storage esc = escrows[escrowId];
        Permission storage perm = permissions[esc.permissionId];

        bool isRevoked = perm.status == PermissionStatus.REVOKED
                         && esc.status == EscrowStatus.FUNDED;
        bool isDisputeResolved = esc.status == EscrowStatus.DISPUTED
                                 && msg.sender == owner();

        require(isRevoked || isDisputeResolved, "Not refundable");

        uint256 refundAmount = esc.amount;
        esc.status = EscrowStatus.REFUNDED;

        paymentToken.safeTransfer(esc.agent, refundAmount);

        emit EscrowRefunded(escrowId, esc.agent, refundAmount);
    }

    // ─── Views ───────────────────────────────────────────────────────────────

    /**
     * @notice Check if a permission is currently valid for a given agent.
     *         This is what the gateway calls for prmission_check_access.
     */
    function checkAccess(
        uint256 permissionId,
        address agent
    ) external view returns (
        bool permitted,
        uint256 compensationBps,
        uint256 upfrontFee,
        uint256 validUntil
    ) {
        Permission storage perm = permissions[permissionId];

        permitted = perm.status == PermissionStatus.ACTIVE
            && block.timestamp < perm.validUntil
            && (perm.merchant == address(0) || perm.merchant == agent);

        return (permitted, perm.compensationBps, perm.upfrontFee, perm.validUntil);
    }

    /**
     * @notice Get all permission IDs for a user.
     */
    function getUserPermissions(address user) external view returns (uint256[] memory) {
        return userPermissions[user];
    }

    /**
     * @notice Calculate the settlement amounts for a given escrow.
     *         Useful for the gateway API to show users what they'll receive.
     */
    function previewSettlement(uint256 escrowId) external view returns (
        uint256 userShare,
        uint256 protocolFee,
        uint256 agentRefund,
        uint256 disputeWindowEnd
    ) {
        Escrow storage esc = escrows[escrowId];
        Permission storage perm = permissions[esc.permissionId];

        userShare = (esc.outcomeValue * perm.compensationBps) / BPS_DENOMINATOR;
        protocolFee = (esc.outcomeValue * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;

        uint256 totalDeductions = userShare + protocolFee;
        agentRefund = esc.amount > totalDeductions ? esc.amount - totalDeductions : 0;
        disputeWindowEnd = esc.reportedAt + DISPUTE_WINDOW;
    }

    // ─── Admin ───────────────────────────────────────────────────────────────

    /**
     * @notice Update treasury address. Only owner.
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }

    /**
     * @notice Resolve a dispute in favor of the user (slash the agent).
     *         Sends escrowed funds to the user. Only owner.
     *         Spec §3.4: DISPUTE-SLASH
     */
    function resolveDisputeForUser(uint256 escrowId) external onlyOwner nonReentrant {
        Escrow storage esc = escrows[escrowId];
        require(esc.status == EscrowStatus.DISPUTED, "Not disputed");

        Permission storage perm = permissions[esc.permissionId];
        uint256 amount = esc.amount;
        esc.status = EscrowStatus.SETTLED;

        // Slash: entire escrow goes to user
        paymentToken.safeTransfer(perm.user, amount);

        emit SettlementCompleted(escrowId, amount, 0, 0);
    }

    /**
     * @notice Expire stale permissions. Can be called by anyone.
     *         Spec §3.5: EXPIRATION
     */
    function expirePermission(uint256 permissionId) external {
        Permission storage perm = permissions[permissionId];
        require(perm.status == PermissionStatus.ACTIVE, "Not active");
        require(block.timestamp >= perm.validUntil, "Not yet expired");

        perm.status = PermissionStatus.EXPIRED;
    }
}
