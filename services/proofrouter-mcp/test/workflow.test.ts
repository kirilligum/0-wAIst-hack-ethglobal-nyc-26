import { describe, expect, it } from "vitest";
import { LlmGateway } from "../src/llm.js";
import { executeInferenceOrder } from "../src/workflow.js";

const testLlm: LlmGateway = {
  async answerPrompt() {
    return "A concise real-looking answer for the test path.";
  },
  async decideRoute() {
    return {
      selectedSellerId: "gamma",
      reason: "Gamma is preferred for this sensitive context.",
      rejectedAlternatives: [
        { sellerId: "alpha", reason: "Cheapest, but less suitable for the context." },
        { sellerId: "beta", reason: "Recent prompt history suggests avoiding repeat exposure." }
      ]
    };
  }
};

describe("executeInferenceOrder", () => {
  it("uses the shared workflow for Quick Buy", async () => {
    const result = await executeInferenceOrder(
      {
        prompt: "Summarize recycling rules for a private office memo.",
        budgetInf: 0.5,
        mode: "quick-buy"
      },
      {
        llm: testLlm,
        env: { PROMPT_HISTORY_FILE: ".local/test-quick-history.enc", PROMPT_HISTORY_KEY_FILE: ".local/test-quick.key" },
        async submitAudit() {
          return { status: "blocked", missing: ["HCS_AUDIT_TOPIC_ID"] };
        }
      }
    );

    expect(result.selectedOffer.sellerId).toBe("alpha");
    expect(result.promptHash).toHaveLength(64);
    expect(JSON.stringify(result.hederaAudit)).not.toContain("Summarize recycling");
  });

  it("uses the shared workflow for Router Agent decisions", async () => {
    const result = await executeInferenceOrder(
      {
        prompt: "Draft a confidential vendor comparison.",
        budgetInf: 1,
        mode: "router-agent"
      },
      {
        llm: testLlm,
        env: { PROMPT_HISTORY_FILE: ".local/test-router-history.enc", PROMPT_HISTORY_KEY_FILE: ".local/test-router.key" },
        async submitAudit() {
          return {
            status: "submitted",
            topicId: "0.0.123",
            transactionId: "0.0.100@1.2",
            hashScanUrl: "https://hashscan.io/testnet/transaction/0.0.100%401.2",
            missing: []
          };
        }
      }
    );

    expect(result.selectedOffer.sellerId).toBe("gamma");
    expect(result.hederaAudit.status).toBe("submitted");
    expect(result.timeline.some((item) => item.label === "OpenAI call")).toBe(true);
  });
});
