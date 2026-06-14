import { describe, expect, it } from "vitest";
import { resolveContractId } from "./contracts.js";
import {
  buildRefundExpiredTransaction,
  resolveRefundScheduleExpirationEpochSeconds,
  scheduledRefundReadiness
} from "./schedule.js";

describe("scheduled refund helpers", () => {
  it("accepts Hedera contract IDs and EVM addresses", () => {
    expect(resolveContractId("0.0.9226648").toString()).toBe("0.0.9226648");
    expect(resolveContractId("0x00000000000000000000000000000000008cc998").toString()).toBe("0.0.9226648");
  });

  it("builds the refundExpired transaction only for positive order IDs", () => {
    const transaction = buildRefundExpiredTransaction({
      proofEscrowContractIdOrAddress: "0.0.9226648",
      orderId: 1
    });

    expect(transaction.functionParameters?.length).toBeGreaterThan(4);
    expect(() => buildRefundExpiredTransaction({
      proofEscrowContractIdOrAddress: "0.0.9226648",
      orderId: 0
    })).toThrow("Scheduled refund orderId must be a positive integer");
  });

  it("reports readiness from either contract ID or EVM address", () => {
    expect(scheduledRefundReadiness({ PROOF_ESCROW_CONTRACT_ID: "0.0.1" }).ready).toBe(true);
    expect(scheduledRefundReadiness({ PROOF_ESCROW_ADDRESS: "0x0000000000000000000000000000000000000001" }).ready).toBe(true);
    expect(scheduledRefundReadiness({}).missing).toEqual(["PROOF_ESCROW_CONTRACT_ID"]);
  });

  it("normalizes refund schedule expiration into the future", () => {
    expect(resolveRefundScheduleExpirationEpochSeconds({
      nowEpochSeconds: 1_800_000_000
    })).toBe(1_800_001_800);
    expect(resolveRefundScheduleExpirationEpochSeconds({
      nowEpochSeconds: 1_800_000_000,
      expirationEpochSeconds: 1_799_999_999
    })).toBe(1_800_000_060);
    expect(resolveRefundScheduleExpirationEpochSeconds({
      nowEpochSeconds: 1_800_000_000,
      expirationEpochSeconds: 1_800_003_600
    })).toBe(1_800_003_600);
  });

  it("rejects refund schedule expirations beyond Hedera's 62-day window", () => {
    expect(() => resolveRefundScheduleExpirationEpochSeconds({
      nowEpochSeconds: 1_800_000_000,
      expirationEpochSeconds: 1_805_356_801
    })).toThrow("refund schedule expirationEpochSeconds must be within 62 days");
  });
});
