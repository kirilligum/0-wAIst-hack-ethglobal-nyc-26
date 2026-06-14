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
      HEDERA_OPERATOR_ID: "0.0.9186037",
      HEDERA_OPERATOR_KEY: "302e",
      DYNAMIC_ENVIRONMENT_ID: "env",
      DYNAMIC_CLIENT_ID: "client",
      DYNAMIC_WALLET_POLICY_ID: "policy",
      X402_FACILITATOR_URL: "https://api.testnet.blocky402.com",
      X402_NETWORK: "hedera-testnet",
      X402_PAYMENT_ASSET: "INF",
      SELLER_EVM_ADDRESS: "0x726a206d0b66730454e175a34bcf9f9fbc086458"
    });

    expect(status.prerequisites.contracts.ready).toBe(true);
    expect(status.prerequisites.inf.ready).toBe(true);
    expect(status.actions.createRefundSchedule.ready).toBe(true);
    expect(status.actions.openOrderViaX402.ready).toBe(true);
    expect(status.actions.submitProofToCre.ready).toBe(false);
    expect(status.actions.submitProofToCre.missing).toContain("RECLAIM_PROVIDER_ID");
    expect(status.actions.settleFromCreReport.ready).toBe(false);
    expect(status.actions.settleFromCreReport.missing).toContain("CRE_SETTLEMENT_SHELL");
    expect(status.actions.publishSellerOffer.ready).toBe(true);
  });
});
