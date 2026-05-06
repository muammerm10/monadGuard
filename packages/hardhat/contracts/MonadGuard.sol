// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MonadGuard
 * @dev Registry for 0-day malware threats on the Monad network.
 * Requires a stake to prevent spam/farming.
 */
contract MonadGuard is Ownable, ReentrancyGuard {
    // Mapping to prevent duplicate submissions (Anti-Farming)
    mapping(bytes32 => bool) public threats;

    // Mapping to store threat submitter address
    mapping(bytes32 => address) public threatSubmitters;

    // Mapping to track if a threat has been rewarded
    mapping(bytes32 => bool) public isRewarded;

    // Mapping to track if a threat has been rejected
    mapping(bytes32 => bool) public isRejected;

    // Track total staked funds and the reward pool
    uint256 public totalStaked;
    uint256 public rewardPool;

    // Event emitted when a new threat is logged
    event ThreatLogged(
        bytes32 indexed hash,
        uint8 score,
        string family,
        address submitter
    );

    // Event emitted when a submitter is rewarded
    event SubmitterRewarded(
        bytes32 indexed hash,
        address indexed submitter,
        uint256 amount
    );

    // Event emitted when a threat is rejected
    event ThreatRejected(
        bytes32 indexed hash,
        address indexed submitter
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @dev Submit a new threat hash. Requires exactly 10 MON (10 ether) stake.
     * @param _hash The SHA-256 hash of the malware
     * @param _score The 0-day probability score (0-100)
     * @param _malwareFamily The malware family name (or "UNKNOWN")
     */
    function submitThreat(bytes32 _hash, uint8 _score, string memory _malwareFamily) public payable {
        // Requirement: Must stake exactly 10 MON
        require(msg.value == 10 ether, "Must stake exactly 10 MON");
        
        // Requirement: Input validation
        require(_hash != bytes32(0), "Invalid hash");
        require(_score > 0 && _score <= 100, "Score must be 1-100");
        require(bytes(_malwareFamily).length > 0, "Family cannot be empty");

        // Requirement: Hash must not be known
        require(!threats[_hash], "Threat already known (Anti-Farming)");

        // Mark as known and store submitter
        threats[_hash] = true;
        threatSubmitters[_hash] = msg.sender;
        totalStaked += msg.value;

        // Emit event
        emit ThreatLogged(_hash, _score, _malwareFamily, msg.sender);

        // Reward logic is handled separately by the admin via rewardSubmitter
    }

    /**
     * @dev Reward a submitter for a valid 0-day threat. Only callable by admin.
     * @param _hash The hash of the validated threat
     */
    function rewardSubmitter(bytes32 _hash) public onlyOwner nonReentrant {
        require(threats[_hash], "Threat not found");
        require(!isRewarded[_hash], "Already rewarded");
        require(!isRejected[_hash], "Threat rejected");
        
        address submitter = threatSubmitters[_hash];
        require(submitter != address(0), "Submitter not found");

        // Checks: Ensure we have enough in the reward pool (10 MON bonus)
        require(rewardPool >= 10 ether, "Insufficient reward pool");

        // Effects
        isRewarded[_hash] = true;
        rewardPool -= 10 ether; // deduct bonus from pool
        totalStaked -= 10 ether; // deduct stake return from total staked
        uint256 rewardAmount = 20 ether; // Return the 10 MON stake + 10 MON reward

        // Interactions
        (bool ok, ) = payable(submitter).call{value: rewardAmount}("");
        require(ok, "Transfer failed");

        emit SubmitterRewarded(_hash, submitter, rewardAmount);
    }

    /**
     * @dev Reject a threat and refund the stake. Only callable by admin.
     * @param _hash The hash of the rejected threat
     */
    function rejectThreat(bytes32 _hash) public onlyOwner nonReentrant {
        require(threats[_hash], "Threat not found");
        require(!isRewarded[_hash], "Already rewarded");
        require(!isRejected[_hash], "Already rejected");

        address submitter = threatSubmitters[_hash];
        require(submitter != address(0), "Submitter not found");

        // Effects
        isRejected[_hash] = true;
        totalStaked -= 10 ether;

        // Interactions
        (bool ok, ) = payable(submitter).call{value: 10 ether}("");
        require(ok, "Refund failed");

        emit ThreatRejected(_hash, submitter);
    }

    /**
     * @dev Function to receive funds for the reward pool
     */
    receive() external payable {
        rewardPool += msg.value;
    }
}
