import { describe, expect, it } from "vitest";
import { createLocalVerifierReceipt } from "../src/localVerifier.js";

const request = {
  orderId: 4,
  requestHash: "a".repeat(64),
  responseHash: "b".repeat(64),
  modelId: "gpt-4.1-mini",
  inputTokens: 100,
  outputTokens: 50,
  proofEscrowContractIdOrAddress: "0.0.9226648",
  chainId: 296
};

describe("local verifier placeholder", () => {
  it("signs a local ProofEscrow-compatible receipt", async () => {
    const result = await createLocalVerifierReceipt(request, {
      VERIFIER_SIGNER_PRIVATE_KEY: "0x0123456789012345678901234567890123456789012345678901234567890123",
      VERIFIER_REGISTRY_CONTRACT_ID: "0.0.9226643"
    });

    expect(result.status).toBe("signed");
    if (result.status !== "signed") {
      throw new Error("expected signed result");
    }
    expect(result.receipt.orderId).toBe(4);
    expect(result.receipt.verifier).toBe("0x14791697260E4c9A71f18484C9f997B308e59325");
    expect(result.receipt.modelId).toHaveLength(64);
    expect(result.verifierSignature).toMatch(/^0x[0-9a-fA-F]{130}$/);
    expect(result.verificationMode).toBe("local-verifier-placeholder");
  });

  it("blocks without local verifier signer configuration", async () => {
    const result = await createLocalVerifierReceipt(request, {});

    expect(result.status).toBe("blocked");
    expect(result.missing).toContain("VERIFIER_SIGNER_PRIVATE_KEY");
    expect(result.missing).toContain("VERIFIER_REGISTRY_CONTRACT_ID");
  });
});
