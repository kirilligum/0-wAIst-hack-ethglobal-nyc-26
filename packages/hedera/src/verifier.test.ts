import { describe, expect, it } from "vitest";
import { createVerifierSigner, loadOrCreateVerifierSigner } from "./verifier.js";

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
});
