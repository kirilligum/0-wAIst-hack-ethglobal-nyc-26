// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ProxyRegistry {
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

    uint256 public nextOfferId = 1;
    mapping(uint256 => Offer) public offers;

    event OfferPublished(uint256 indexed offerId, address indexed seller, bytes32 modelId);
    event OfferPriceUpdated(uint256 indexed offerId, uint256 inputPricePerMTok, uint256 outputPricePerMTok, uint256 fixedFee);
    event OfferDeactivated(uint256 indexed offerId);

    function publishOffer(Offer calldata offer) external returns (uint256 offerId) {
        require(offer.seller == msg.sender, "seller must publish own offer");
        require(offer.active, "offer must start active");
        offerId = nextOfferId++;
        offers[offerId] = offer;
        emit OfferPublished(offerId, offer.seller, offer.modelId);
    }

    function updateOfferPrice(
        uint256 offerId,
        uint256 inputPricePerMTok,
        uint256 outputPricePerMTok,
        uint256 fixedFee
    ) external {
        Offer storage offer = offers[offerId];
        require(offer.seller == msg.sender, "only seller");
        offer.inputPricePerMTok = inputPricePerMTok;
        offer.outputPricePerMTok = outputPricePerMTok;
        offer.fixedFee = fixedFee;
        emit OfferPriceUpdated(offerId, inputPricePerMTok, outputPricePerMTok, fixedFee);
    }

    function deactivateOffer(uint256 offerId) external {
        Offer storage offer = offers[offerId];
        require(offer.seller == msg.sender, "only seller");
        offer.active = false;
        emit OfferDeactivated(offerId);
    }
}
