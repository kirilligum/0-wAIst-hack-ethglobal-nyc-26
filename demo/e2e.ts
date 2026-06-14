import { executeInferenceOrder } from "../services/proofrouter-mcp/src/workflow.js";
import { LlmGateway } from "../services/proofrouter-mcp/src/llm.js";

const llm: LlmGateway = {
  async answerPrompt() {
    return "E2E answer generated through the shared order workflow.";
  },
  async decideRoute() {
    return {
      selectedSellerId: "gamma",
      reason: "Gamma is selected for the context packet.",
      rejectedAlternatives: [
        { sellerId: "alpha", reason: "Less suitable for this context." },
        { sellerId: "beta", reason: "Prompt history indicates repeated exposure." }
      ]
    };
  }
};

const result = await executeInferenceOrder(
  {
    prompt: "Private e2e prompt with someone@example.com inside it.",
    budgetInf: 1,
    mode: "router-agent"
  },
  {
    llm,
    env: { PROMPT_HISTORY_FILE: ".local/e2e-history.enc", PROMPT_HISTORY_KEY_FILE: ".local/e2e.key" },
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

if (result.selectedOffer.sellerId !== "gamma") {
  throw new Error("Router Agent e2e did not select Gamma");
}

const publicBody = JSON.stringify({
  hederaAudit: result.hederaAudit,
  promptHash: result.promptHash,
  requestHash: result.requestHash,
  responseHash: result.responseHash
});

if (publicBody.includes("someone@example.com") || publicBody.includes("Private e2e prompt")) {
  throw new Error("Public e2e artifacts leaked plaintext prompt content");
}

console.log(JSON.stringify({
  status: "pass",
  orderId: result.orderId,
  selectedSeller: result.selectedOffer.sellerId,
  traceDir: result.traceDir
}, null, 2));
