import { describe, expect, it } from "vitest";
import {
  encodePublishOfferFunctionData,
  infToBaseUnits,
  proxyRegistryReadiness,
  textToBytes32
} from "./registry.js";

describe("ProxyRegistry helpers", () => {
  it("encodes INF decimals in base units", () => {
    expect(infToBaseUnits(0.01)).toBe(1_000_000);
    expect(infToBaseUnits(0.05)).toBe(5_000_000);
  });

  it("hashes registry labels to fixed bytes32 values", () => {
    expect(textToBytes32("mock-llm-v1")).toHaveLength(32);
  });

  it("encodes the publishOffer contract call", () => {
    const encoded = encodePublishOfferFunctionData({
      sellerEvmAddress: "0x726a206d0b66730454e175a34bcf9f9fbc086458",
      provider: "mock-local",
      modelId: "mock-llm-v1",
      endpoint: "http://localhost:8790/x402",
      inputPricePerMTokInf: 0.05,
      outputPricePerMTokInf: 0.12,
      fixedFeeInf: 0.01,
      maxInputTokens: 32_000,
      maxOutputTokens: 4_000,
      hfsManifestFileId: "0.0.9226269"
    });

    expect(Buffer.from(encoded).toString("hex").startsWith("6fc3beab")).toBe(true);
  });

  it("reports missing seller publication credentials", () => {
    const status = proxyRegistryReadiness({
      HEDERA_OPERATOR_ID: "0.0.1",
      HEDERA_OPERATOR_KEY: "302e",
      PROXY_REGISTRY_CONTRACT_ID: "0.0.2"
    });

    expect(status.ready).toBe(false);
    expect(status.missing).toContain("SELLER_EVM_ADDRESS");
  });
});
