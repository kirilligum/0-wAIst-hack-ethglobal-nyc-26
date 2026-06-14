import { describe, expect, it } from "vitest";
import {
  buildOpenOrderTransaction,
  encodeOpenOrderFunctionData,
  openOrderCalldataHex,
  openOrderReadiness
} from "./order.js";

const order = {
  offerId: 7,
  promptHash: "a".repeat(64),
  requestHash: "b".repeat(64),
  deadlineEpochSeconds: 1_800_000_000
};

describe("ProofEscrow order helpers", () => {
  it("encodes ProofEscrow.openOrder calldata", () => {
    const encoded = encodeOpenOrderFunctionData(order);

    expect(openOrderCalldataHex(order).slice(0, 10)).toBe("0x32f97bbb");
    expect(Buffer.from(encoded).toString("hex").slice(0, 8)).toBe("32f97bbb");
    expect(encoded.length).toBeGreaterThan(4);
  });

  it("builds a contract execute transaction for openOrder", () => {
    const transaction = buildOpenOrderTransaction({
      proofEscrowContractIdOrAddress: "0.0.9226648",
      order
    });

    expect(transaction.functionParameters?.length).toBeGreaterThan(4);
  });

  it("requires Hedera operator, INF token, and ProofEscrow config", () => {
    expect(openOrderReadiness({
      HEDERA_OPERATOR_ID: "0.0.9186037",
      HEDERA_OPERATOR_KEY: "302e",
      HTS_INF_TOKEN_ID: "0.0.9226625",
      PROOF_ESCROW_CONTRACT_ID: "0.0.9226648"
    }).ready).toBe(true);
    expect(openOrderReadiness({}).missing).toEqual([
      "HEDERA_OPERATOR_ID",
      "HEDERA_OPERATOR_KEY",
      "PROOF_ESCROW_CONTRACT_ID",
      "HTS_INF_TOKEN_ID"
    ]);
  });
});
