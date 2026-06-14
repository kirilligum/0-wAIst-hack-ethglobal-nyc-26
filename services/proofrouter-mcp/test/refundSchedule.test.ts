import { describe, expect, it } from "vitest";
import { createRefundScheduleForOrder } from "../src/refundSchedule.js";

describe("refund schedule guard", () => {
  it("blocks until the caller confirms a funded ProofEscrow order", async () => {
    const result = await createRefundScheduleForOrder({
      orderId: 1
    }, {
      HEDERA_OPERATOR_ID: "0.0.9186037",
      HEDERA_OPERATOR_KEY: "302e",
      PROOF_ESCROW_CONTRACT_ID: "0.0.9229559"
    });

    expect(result.status).toBe("blocked");
    expect(result.missing).toContain("confirmedFundedOrder");
  });

  it("blocks when ProofEscrow is not configured", async () => {
    const result = await createRefundScheduleForOrder({
      orderId: 1,
      confirmedFundedOrder: true
    }, {
      HEDERA_OPERATOR_ID: "0.0.9186037",
      HEDERA_OPERATOR_KEY: "302e"
    });

    expect(result.status).toBe("blocked");
    expect(result.missing).toContain("PROOF_ESCROW_CONTRACT_ID");
  });

  it("reports all missing schedule prerequisites together", async () => {
    const result = await createRefundScheduleForOrder({
      orderId: 1
    }, {});

    expect(result.status).toBe("blocked");
    expect(result.missing).toEqual([
      "confirmedFundedOrder",
      "PROOF_ESCROW_CONTRACT_ID"
    ]);
  });
});
