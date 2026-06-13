import { describe, expect, it } from "vitest";
import {
  batchSettlementReadiness,
  buildSettleTransaction,
  encodeSettleFunctionData
} from "./batch.js";

const receipt = {
  orderId: 1,
  requestHash: "a".repeat(64),
  responseHash: "b".repeat(64),
  modelId: "c".repeat(64),
  inputTokens: 10,
  outputTokens: 20,
  verifier: "0x0000000000000000000000000000000000000001"
};

const signature = `0x${"d".repeat(130)}`;

describe("batch settlement helpers", () => {
  it("encodes ProofEscrow.settle calldata with a selector", () => {
    const encoded = encodeSettleFunctionData(receipt, signature);

    expect(Buffer.from(encoded).toString("hex").slice(0, 8)).toBe("1bc433b3");
    expect(encoded.length).toBeGreaterThan(4);
  });

  it("builds a contract execute transaction for settle", () => {
    const transaction = buildSettleTransaction({
      proofEscrowContractIdOrAddress: "0.0.9226648",
      receipt,
      verifierSignature: signature
    });

    expect(transaction.functionParameters?.length).toBeGreaterThan(4);
  });

  it("requires both escrow and audit topic readiness", () => {
    expect(batchSettlementReadiness({
      PROOF_ESCROW_CONTRACT_ID: "0.0.9226648",
      HCS_AUDIT_TOPIC_ID: "0.0.9226268"
    }).ready).toBe(true);
    expect(batchSettlementReadiness({}).missing).toEqual([
      "PROOF_ESCROW_CONTRACT_ID",
      "HCS_AUDIT_TOPIC_ID"
    ]);
  });
});
