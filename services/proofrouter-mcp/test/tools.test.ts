import { describe, expect, it } from "vitest";
import { getHederaActionStatus } from "../src/tools.js";

describe("Hedera action status", () => {
  it("reports concrete action readiness without unlocking blocked integrations", () => {
    const status = getHederaActionStatus({
      HTS_INF_TOKEN_ID: "0.0.9226625",
      PROXY_REGISTRY_CONTRACT_ID: "0.0.9226646",
      PROOF_ESCROW_CONTRACT_ID: "0.0.9226648",
      VERIFIER_REGISTRY_CONTRACT_ID: "0.0.9226643",
      HCS_AUDIT_TOPIC_ID: "0.0.9226268",
      X402_NETWORK: "hedera-testnet",
      X402_PAYMENT_ASSET: "INF"
    });

    expect(status.prerequisites.contracts.ready).toBe(true);
    expect(status.prerequisites.inf.ready).toBe(true);
    expect(status.actions.createRefundSchedule.ready).toBe(true);
    expect(status.actions.batchSettleAndLog.ready).toBe(true);
    expect(status.actions.openOrderViaX402.ready).toBe(false);
    expect(status.actions.openOrderViaX402.missing).toContain("DYNAMIC_ENVIRONMENT_ID");
    expect(status.actions.openOrderViaX402.missing).toContain("X402_FACILITATOR_URL");
  });
});
