import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { listProxyOffers } from "../src/offers.js";
import { registerSellerOffer } from "../src/sellerRegistration.js";

describe("seller registration", () => {
  it("saves a local seller offer without publishing on-chain", async () => {
    const registeredFile = resolve(".local/test-seller-offers.json");
    await rm(registeredFile, { force: true });

    const result = await registerSellerOffer({
      sellerId: "local-dev",
      displayName: "Local Dev Seller",
      sellerEnsName: "Local-Dev.ETH",
      modelId: "mock-llm-v1",
      provider: "mock-local",
      x402Endpoint: "http://localhost:8790/x402",
      hederaAccount: "0.0.9186037",
      fixedFeeInf: 0.005,
      maxBudgetInf: 0.25,
      publishOnChain: false
    }, {
      REGISTERED_OFFERS_FILE: registeredFile
    });

    expect(result.status).toBe("local");
    expect(result.offer.registryStatus).toBe("local");
    expect(result.offer.sellerEnsName).toBe("local-dev.eth");
    expect(listProxyOffers({ REGISTERED_OFFERS_FILE: registeredFile }).some((offer) => (
      offer.sellerId === "local-dev" && offer.sellerEnsName === "local-dev.eth"
    ))).toBe(true);
  });

  it("blocks on-chain publication until the seller EVM address exists", async () => {
    const result = await registerSellerOffer({
      sellerId: "needs-address",
      displayName: "Needs Address",
      modelId: "mock-llm-v1",
      provider: "mock-local",
      x402Endpoint: "http://localhost:8790/x402",
      hederaAccount: "0.0.9186037",
      publishOnChain: true
    }, {
      HEDERA_OPERATOR_ID: "0.0.9186037",
      HEDERA_OPERATOR_KEY: "302e",
      PROXY_REGISTRY_CONTRACT_ID: "0.0.9226646"
    });

    expect(result.status).toBe("blocked");
    expect(result.missing).toContain("SELLER_EVM_ADDRESS");
  });
});
