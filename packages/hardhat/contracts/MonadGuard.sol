// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MonadGuard
 * @dev Registry for 0-day malware threats on the Monad network.
 * Requires a stake to prevent spam/farming.
 */
contract MonadGuard {
    // Mapping to prevent duplicate submissions (Anti-Farming)
    mapping(bytes32 => bool) public threats;

    // Event emitted when a new threat is logged
    event ThreatLogged(
        bytes32 indexed hash,
        uint8 score,
        string family,
        address submitter
    );

    /**
     * @dev Submit a new threat hash. Requires exactly 10 MON (10 ether) stake.
     * @param _hash The SHA-256 hash of the malware
     * @param _score The 0-day probability score (0-100)
     * @param _malwareFamily The malware family name (or "UNKNOWN")
     */
    function submitThreat(bytes32 _hash, uint8 _score, string memory _malwareFamily) public payable {
        // Requirement: Must stake exactly 10 MON
        require(msg.value == 10 ether, "Must stake exactly 10 MON");
        
        // Requirement: Hash must not be known
        require(!threats[_hash], "Threat already known (Anti-Farming)");

        // Mark as known
        threats[_hash] = true;

        // Emit event
        emit ThreatLogged(_hash, _score, _malwareFamily, msg.sender);

        // TODO: Reward Logic (Skeleton)
        // If a 'Governor' (e.g., a trusted DAO or multi-sig of security researchers)
        // confirms this threat is a valid 0-day, the submitter could be rewarded.
        // Example:
        // uint256 rewardAmount = msg.value * 2; // Return stake + reward
        // require(address(this).balance >= rewardAmount, "Insufficient reward pool");
        // payable(msg.sender).transfer(rewardAmount);
    }
}
