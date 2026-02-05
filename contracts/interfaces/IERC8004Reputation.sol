// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IERC8004Reputation
 * @notice Minimal interface for the ERC-8004 Reputation Registry.
 *         Prmission reads reputation to gate escrow deposits —
 *         agents below a minimum trust threshold can't access user data.
 *
 * Reference: https://eips.ethereum.org/EIPS/eip-8004
 */
interface IERC8004Reputation {
    /// @notice Returns the Identity Registry this Reputation Registry is linked to
    function getIdentityRegistry() external view returns (address);

    /// @notice Aggregated reputation summary for an agent, filtered by clientAddresses and optional tags.
    /// @param agentId          The agent's ERC-8004 token ID
    /// @param clientAddresses  Required list of trusted reviewer addresses
    /// @param tag1             Optional first tag filter (empty string = no filter)
    /// @param tag2             Optional second tag filter (empty string = no filter)
    /// @return count           Number of matching feedback entries
    /// @return summaryValue    Aggregated feedback value
    /// @return summaryValueDecimals Decimal precision of summaryValue
    function getSummary(
        uint256 agentId,
        address[] calldata clientAddresses,
        string calldata tag1,
        string calldata tag2
    ) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals);

    /// @notice Read a single feedback entry
    function readFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex
    ) external view returns (
        int128 value,
        uint8 valueDecimals,
        string memory tag1,
        string memory tag2,
        bool isRevoked
    );

    /// @notice Get all client addresses that have given feedback to an agent
    function getClients(uint256 agentId) external view returns (address[] memory);

    /// @notice Get the number of feedback entries from a specific client to an agent
    function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64);
}
