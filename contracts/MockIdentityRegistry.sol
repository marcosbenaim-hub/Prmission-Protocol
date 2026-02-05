// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MockIdentityRegistry
 * @notice Minimal mock of ERC-8004 Identity Registry for testing Prmission.
 *         NOT a real ERC-721. Just enough to satisfy the interface.
 */
contract MockIdentityRegistry {
    uint256 private _nextId = 1;

    struct Agent {
        address owner;
        address wallet;
        string  uri;
        bool    exists;
    }

    mapping(uint256 => Agent) public agents;

    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);

    function register(string calldata agentURI) external returns (uint256 agentId) {
        agentId = _nextId++;
        agents[agentId] = Agent({
            owner: msg.sender,
            wallet: msg.sender,
            uri: agentURI,
            exists: true
        });
        emit Registered(agentId, agentURI, msg.sender);
    }

    function ownerOf(uint256 agentId) external view returns (address) {
        require(agents[agentId].exists, "Agent not registered");
        return agents[agentId].owner;
    }

    function tokenURI(uint256 agentId) external view returns (string memory) {
        require(agents[agentId].exists, "Agent not registered");
        return agents[agentId].uri;
    }

    function getAgentWallet(uint256 agentId) external view returns (address) {
        require(agents[agentId].exists, "Agent not registered");
        return agents[agentId].wallet;
    }

    function getMetadata(uint256, string memory) external pure returns (bytes memory) {
        return "";
    }

    // Test helpers
    function setAgentWallet(uint256 agentId, address wallet) external {
        agents[agentId].wallet = wallet;
    }
}
