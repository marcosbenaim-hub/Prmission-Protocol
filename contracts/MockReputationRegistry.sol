// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockReputationRegistry {
    address public identityRegistryAddr;
    mapping(uint256 => int128) public scores;
    mapping(uint256 => uint64) public counts;

    function initialize(address r) external { identityRegistryAddr = r; }
    function getIdentityRegistry() external view returns (address) { return identityRegistryAddr; }

    function setScore(uint256 agentId, int128 score) external {
        scores[agentId] = score;
        counts[agentId] = 1;
    }

    function getSummary(uint256 agentId, address[] calldata, string calldata, string calldata) external view returns (uint64, int128, uint8) {
        return (counts[agentId], scores[agentId], 0);
    }

    function readFeedback(uint256, address, uint64) external pure returns (int128, uint8, string memory, string memory, bool) {
        return (0, 0, "", "", false);
    }
    function getClients(uint256) external pure returns (address[] memory) { return new address[](0); }
    function getLastIndex(uint256, address) external pure returns (uint64) { return 0; }
}
