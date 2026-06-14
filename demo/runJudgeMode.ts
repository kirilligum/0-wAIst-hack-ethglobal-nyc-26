import "dotenv/config";
import { executeInferenceOrder } from "../services/proofrouter-mcp/src/workflow.js";

const result = await executeInferenceOrder({
  prompt: "Give me a compact three-point demo script for 0-wAIst on Hedera Testnet.",
  budgetInf: 0.5,
  mode: "quick-buy"
});

console.log(JSON.stringify({
  orderId: result.orderId,
  seller: result.selectedOffer.displayName,
  hederaAudit: result.hederaAudit,
  traceDir: result.traceDir,
  answer: result.answer
}, null, 2));
