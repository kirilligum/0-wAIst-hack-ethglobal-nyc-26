import { describe, expect, it } from "vitest";
import { openOrderViaX402 } from "../src/orderOpening.js";

const readyEnv = {
  HEDERA_OPERATOR_ID: "0.0.9186037",
  HEDERA_OPERATOR_KEY: "302e",
  HTS_INF_TOKEN_ID: "0.0.9226625",
  PROOF_ESCROW_CONTRACT_ID: "0.0.9226648",
  DYNAMIC_ENVIRONMENT_ID: "env",
  DYNAMIC_CLIENT_ID: "client",
  DYNAMIC_WALLET_POLICY_ID: "policy",
  X402_FACILITATOR_URL: "https://api.testnet.blocky402.com",
  X402_NETWORK: "hedera-testnet",
  X402_PAYMENT_ASSET: "INF"
};

const request = {
  offerId: 7,
  promptHash: "a".repeat(64),
  requestHash: "b".repeat(64),
  deadlineEpochSeconds: 1_800_000_000
};

describe("openOrderViaX402", () => {
  it("prepares a ProofEscrow.openOrder transaction for the buyer wallet", async () => {
    const result = await openOrderViaX402(request, readyEnv);

    expect(result.status).toBe("prepared");
    if (result.status === "prepared") {
      expect(result.preparedTransaction.proofEscrowContractIdOrAddress).toBe("0.0.9226648");
      expect(result.preparedTransaction.functionParametersHex.startsWith("0x")).toBe(true);
      expect(result.preparedTransaction.x402.paymentAsset).toBe("INF");
    }
  });

  it("blocks live submission until the configured buyer signer is confirmed", async () => {
    const result = await openOrderViaX402({
      ...request,
      submitOnChain: true
    }, readyEnv);

    expect(result.status).toBe("blocked");
    if (result.status === "blocked") {
      expect(result.missing).toContain("confirmedBuyerSigner");
      expect(result.preparedTransaction.functionName).toBe("openOrder");
    }
  });

  it("reports missing Dynamic and x402 configuration", async () => {
    const result = await openOrderViaX402(request, {
      HEDERA_OPERATOR_ID: "0.0.9186037",
      HEDERA_OPERATOR_KEY: "302e",
      HTS_INF_TOKEN_ID: "0.0.9226625",
      PROOF_ESCROW_CONTRACT_ID: "0.0.9226648"
    });

    expect(result.status).toBe("blocked");
    if (result.status === "blocked") {
      expect(result.missing).toContain("DYNAMIC_ENVIRONMENT_ID");
      expect(result.missing).toContain("X402_FACILITATOR_URL");
    }
  });
});
