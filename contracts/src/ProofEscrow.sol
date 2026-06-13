// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IInfToken {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IVerifierRegistry {
    function isVerifier(address verifier) external view returns (bool);
}

contract ProofEscrow {
    enum OrderStatus {
        None,
        Open,
        Settled,
        Refunded
    }

    struct VerifiedReceipt {
        uint256 orderId;
        bytes32 requestHash;
        bytes32 responseHash;
        bytes32 modelId;
        uint256 inputTokens;
        uint256 outputTokens;
        address verifier;
    }

    struct Order {
        uint256 offerId;
        address buyer;
        address seller;
        bytes32 promptHash;
        bytes32 requestHash;
        uint64 deadline;
        uint256 lockedAmount;
        OrderStatus status;
    }

    IInfToken public immutable infToken;
    IVerifierRegistry public immutable verifierRegistry;
    uint256 public nextOrderId = 1;
    mapping(uint256 => Order) public orders;

    event OrderOpened(uint256 indexed orderId, uint256 indexed offerId, address indexed buyer, bytes32 requestHash);
    event OrderSettled(uint256 indexed orderId, address indexed verifier, bytes32 responseHash);
    event OrderRefunded(uint256 indexed orderId);

    constructor(address infTokenAddress, address verifierRegistryAddress) {
        infToken = IInfToken(infTokenAddress);
        verifierRegistry = IVerifierRegistry(verifierRegistryAddress);
    }

    function openOrder(
        uint256 offerId,
        bytes32 promptHash,
        bytes32 requestHash,
        uint64 deadline
    ) external returns (uint256 orderId) {
        require(deadline > block.timestamp, "deadline must be future");
        orderId = nextOrderId++;
        orders[orderId] = Order({
            offerId: offerId,
            buyer: msg.sender,
            seller: address(0),
            promptHash: promptHash,
            requestHash: requestHash,
            deadline: deadline,
            lockedAmount: 0,
            status: OrderStatus.Open
        });
        emit OrderOpened(orderId, offerId, msg.sender, requestHash);
    }

    function settle(VerifiedReceipt calldata receipt, bytes calldata verifierSignature) external {
        Order storage order = orders[receipt.orderId];
        require(order.status == OrderStatus.Open, "order not open");
        require(order.requestHash == receipt.requestHash, "request hash mismatch");
        require(verifierRegistry.isVerifier(receipt.verifier), "verifier not approved");
        require(verifierSignature.length > 0, "verifier signature required");
        order.status = OrderStatus.Settled;
        emit OrderSettled(receipt.orderId, receipt.verifier, receipt.responseHash);
    }

    function refundExpired(uint256 orderId) external {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Open, "order not open");
        require(block.timestamp > order.deadline, "deadline not reached");
        order.status = OrderStatus.Refunded;
        emit OrderRefunded(orderId);
    }
}
