import { describe, expect, it } from "vitest";
import {
  createVerifierSigner,
  loadOrCreateVerifierSigner,
  localVerifierReceiptHash,
  signLocalVerifierReceipt
} from "./verifier.js";

describe("verifier signer helpers", () => {
  it("creates an EVM verifier signer", () => {
    const signer = createVerifierSigner();

    expect(signer.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(signer.privateKey).toMatch(/^0x[0-9a-fA-F]{64}$/);
  });

  it("derives the address from an existing private key", () => {
    const signer = loadOrCreateVerifierSigner({
      VERIFIER_SIGNER_PRIVATE_KEY: "0x0123456789012345678901234567890123456789012345678901234567890123"
    });

    expect(signer.address).toBe("0x14791697260E4c9A71f18484C9f997B308e59325");
  });

  it("signs a ProofEscrow-compatible placeholder receipt", async () => {
    const signer = loadOrCreateVerifierSigner({
      VERIFIER_SIGNER_PRIVATE_KEY: "0x0123456789012345678901234567890123456789012345678901234567890123"
    });
    const receipt = {
      orderId: 7,
      requestHash: "a".repeat(64),
      responseHash: "b".repeat(64),
      modelId: "c".repeat(64),
      inputTokens: 120,
      outputTokens: 80
    };

    const signed = await signLocalVerifierReceipt({
      chainId: 296,
      proofEscrowContractIdOrAddress: "0.0.9226648",
      receipt,
      verifierPrivateKey: signer.privateKey
    });

    expect(signed.receipt.verifier).toBe(signer.address);
    expect(signed.receiptHash).toBe(localVerifierReceiptHash({
      chainId: 296,
      proofEscrowContractIdOrAddress: "0.0.9226648",
      receipt: signed.receipt
    }));
    expect(signed.verifierSignature).toMatch(/^0x[0-9a-fA-F]{130}$/);
    expect(signed.recoveredVerifier).toBe(signer.address);
    expect(signed.verificationMode).toBe("local-verifier-placeholder");
  });
});
