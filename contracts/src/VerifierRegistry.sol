// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract VerifierRegistry {
    address public owner;
    mapping(address => bool) private approved;

    event VerifierSet(address indexed verifier, bool approved);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    function setVerifier(address verifier, bool isApproved) external onlyOwner {
        approved[verifier] = isApproved;
        emit VerifierSet(verifier, isApproved);
    }

    function isVerifier(address verifier) external view returns (bool) {
        return approved[verifier];
    }
}
