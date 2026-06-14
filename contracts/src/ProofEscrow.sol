// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IInfToken {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IVerifierRegistry {
    function isVerifier(address verifier) external view returns (bool);
}

interface IProxyRegistry {
    struct Offer {
        address seller;
        bytes32 providerId;
        bytes32 modelId;
        bytes32 endpointId;
        uint256 inputPricePerMTok;
        uint256 outputPricePerMTok;
        uint256 fixedFee;
        uint256 maxInputTokens;
        uint256 maxOutputTokens;
        uint64 validUntil;
        bytes32 hfsManifestFileIdHash;
        bool active;
    }

    function getOffer(uint256 offerId) external view returns (Offer memory);
}

contract ProofEscrow {
    uint256 private constant TOKENS_PER_MILLION = 1_000_000;

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
        bytes32 modelId;
        bytes32 promptHash;
        bytes32 requestHash;
        uint64 deadline;
        uint256 lockedAmount;
        uint256 inputPricePerMTok;
        uint256 outputPricePerMTok;
        uint256 fixedFee;
        uint256 maxInputTokens;
        uint256 maxOutputTokens;
        OrderStatus status;
    }

    IInfToken public immutable infToken;
    IVerifierRegistry public immutable verifierRegistry;
    IProxyRegistry public immutable proxyRegistry;
    uint256 public nextOrderId = 1;
    mapping(uint256 => Order) public orders;

    event OrderOpened(uint256 indexed orderId, uint256 indexed offerId, address indexed buyer, address seller, uint256 lockedAmount, bytes32 requestHash);
    event OrderSettled(uint256 indexed orderId, address indexed verifier, bytes32 responseHash, uint256 sellerAmount, uint256 refundAmount);
    event OrderRefunded(uint256 indexed orderId, uint256 refundAmount);

    constructor(address infTokenAddress, address verifierRegistryAddress, address proxyRegistryAddress) {
        infToken = IInfToken(infTokenAddress);
        verifierRegistry = IVerifierRegistry(verifierRegistryAddress);
        proxyRegistry = IProxyRegistry(proxyRegistryAddress);
    }

    function openOrder(
        uint256 offerId,
        bytes32 promptHash,
        bytes32 requestHash,
        uint64 deadline
    ) external returns (uint256 orderId) {
        require(deadline > block.timestamp, "deadline must be future");
        IProxyRegistry.Offer memory offer = proxyRegistry.getOffer(offerId);
        require(offer.active, "offer inactive");
        require(offer.seller != address(0), "seller missing");
        require(offer.validUntil == 0 || offer.validUntil >= deadline, "offer expires first");

        uint256 lockedAmount = quoteMaxCharge(offer);
        require(lockedAmount > 0, "zero locked amount");
        require(infToken.transferFrom(msg.sender, address(this), lockedAmount), "INF lock failed");

        orderId = nextOrderId++;
        orders[orderId] = Order({
            offerId: offerId,
            buyer: msg.sender,
            seller: offer.seller,
            modelId: offer.modelId,
            promptHash: promptHash,
            requestHash: requestHash,
            deadline: deadline,
            lockedAmount: lockedAmount,
            inputPricePerMTok: offer.inputPricePerMTok,
            outputPricePerMTok: offer.outputPricePerMTok,
            fixedFee: offer.fixedFee,
            maxInputTokens: offer.maxInputTokens,
            maxOutputTokens: offer.maxOutputTokens,
            status: OrderStatus.Open
        });
        emit OrderOpened(orderId, offerId, msg.sender, offer.seller, lockedAmount, requestHash);
    }

    function settle(VerifiedReceipt calldata receipt, bytes calldata verifierSignature) external {
        Order storage order = orders[receipt.orderId];
        require(order.status == OrderStatus.Open, "order not open");
        require(order.requestHash == receipt.requestHash, "request hash mismatch");
        require(order.modelId == receipt.modelId, "model mismatch");
        require(receipt.inputTokens <= order.maxInputTokens, "input tokens too high");
        require(receipt.outputTokens <= order.maxOutputTokens, "output tokens too high");
        require(verifierRegistry.isVerifier(receipt.verifier), "verifier not approved");
        require(_recoverVerifier(receipt, verifierSignature) == receipt.verifier, "bad verifier signature");

        uint256 sellerAmount = quoteActualCharge(order, receipt.inputTokens, receipt.outputTokens);
        require(sellerAmount <= order.lockedAmount, "charge exceeds lock");
        uint256 refundAmount = order.lockedAmount - sellerAmount;

        order.status = OrderStatus.Settled;
        if (sellerAmount > 0) {
            require(infToken.transfer(order.seller, sellerAmount), "seller transfer failed");
        }
        if (refundAmount > 0) {
            require(infToken.transfer(order.buyer, refundAmount), "refund transfer failed");
        }

        emit OrderSettled(receipt.orderId, receipt.verifier, receipt.responseHash, sellerAmount, refundAmount);
    }

    function refundExpired(uint256 orderId) external {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Open, "order not open");
        require(block.timestamp > order.deadline, "deadline not reached");
        uint256 refundAmount = order.lockedAmount;
        order.status = OrderStatus.Refunded;
        if (refundAmount > 0) {
            require(infToken.transfer(order.buyer, refundAmount), "refund transfer failed");
        }
        emit OrderRefunded(orderId, refundAmount);
    }

    function quoteMaxCharge(IProxyRegistry.Offer memory offer) public pure returns (uint256) {
        return offer.fixedFee
            + _ceilMulDiv(offer.inputPricePerMTok, offer.maxInputTokens, TOKENS_PER_MILLION)
            + _ceilMulDiv(offer.outputPricePerMTok, offer.maxOutputTokens, TOKENS_PER_MILLION);
    }

    function quoteActualCharge(
        Order memory order,
        uint256 inputTokens,
        uint256 outputTokens
    ) public pure returns (uint256) {
        return order.fixedFee
            + _ceilMulDiv(order.inputPricePerMTok, inputTokens, TOKENS_PER_MILLION)
            + _ceilMulDiv(order.outputPricePerMTok, outputTokens, TOKENS_PER_MILLION);
    }

    function receiptHash(VerifiedReceipt calldata receipt) public view returns (bytes32) {
        return keccak256(
            abi.encode(
                block.chainid,
                address(this),
                receipt.orderId,
                receipt.requestHash,
                receipt.responseHash,
                receipt.modelId,
                receipt.inputTokens,
                receipt.outputTokens,
                receipt.verifier
            )
        );
    }

    function _ceilMulDiv(uint256 a, uint256 b, uint256 denominator) private pure returns (uint256) {
        if (a == 0 || b == 0) {
            return 0;
        }
        return ((a * b) - 1) / denominator + 1;
    }

    function _recoverVerifier(
        VerifiedReceipt calldata receipt,
        bytes calldata verifierSignature
    ) private view returns (address) {
        require(verifierSignature.length == 65, "verifier signature length");
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", receiptHash(receipt)));
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(verifierSignature.offset)
            s := calldataload(add(verifierSignature.offset, 32))
            v := byte(0, calldataload(add(verifierSignature.offset, 64)))
        }
        if (v < 27) {
            v += 27;
        }
        require(v == 27 || v == 28, "verifier signature v");
        return ecrecover(digest, v, r, s);
    }
}
