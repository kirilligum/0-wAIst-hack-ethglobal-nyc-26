import { describe, expect, it } from "vitest";
import { approveInfAllowanceForBuyer } from "../src/infAllowance.js";

describe("INF allowance approval guard", () => {
  it("blocks until the buyer owner account is confirmed", async () => {
    const result = await approveInfAllowanceForBuyer({
      amountInf: 0.5
    }, {
      HEDERA_OPERATOR_ID: "0.0.9186037",
      HEDERA_OPERATOR_KEY: "302e",
      HTS_INF_TOKEN_ID: "0.0.9226625",
      PROOF_ESCROW_CONTRACT_ID: "0.0.9226648"
    });

    expect(result.status).toBe("blocked");
    expect(result.missing).toContain("confirmedOwner");
  });

  it("blocks non-operator buyer allowance without buyer key", async () => {
    const result = await approveInfAllowanceForBuyer({
      amountInf: 0.5,
      confirmedOwner: true,
      ownerAccountId: "0.0.5001"
    }, {
      HEDERA_OPERATOR_ID: "0.0.9186037",
      HEDERA_OPERATOR_KEY: "302e",
      HTS_INF_TOKEN_ID: "0.0.9226625",
      PROOF_ESCROW_CONTRACT_ID: "0.0.9226648"
    });

    expect(result.status).toBe("blocked");
    expect(result.missing).toContain("BUYER_HEDERA_KEY");
  });
});
