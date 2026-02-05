// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IERC8004Identity
 * @notice Minimal interface for the ERC-8004 Identity Registry.
 *         ERC-8004 extends ERC-721; agentId = tokenId.
 *         We only need to check: does this agent exist, who owns it,
 *         and optionally read its wallet address.
 *
 * Reference: https://eips.ethereum.org/EIPS/eip-8004
 */
interface IERC8004Identity {
    /// @notice Returns the owner of the agent NFT (ERC-721 ownerOf)
    function ownerOf(uint256 agentId) external view returns (address);

    /// @notice Returns the agent's URI (registration file pointer)
    function tokenURI(uint256 agentId) external view returns (string memory);

    /// @notice Returns the wallet address set for this agent
    ///         (the address where the agent receives payments)
    function getAgentWallet(uint256 agentId) external view returns (address);

    /// @notice Returns on-chain metadata for a given key
    function getMetadata(uint256 agentId, string memory metadataKey) external view returns (bytes memory);
}
