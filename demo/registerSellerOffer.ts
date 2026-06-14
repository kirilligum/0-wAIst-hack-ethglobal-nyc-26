import "dotenv/config";
import { registerSellerOffer } from "../services/proofrouter-mcp/src/sellerRegistration.js";
import { updateEnvFile } from "../services/proofrouter-mcp/src/envFile.js";

function numberFromEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${key} must be a number`);
  }
  return parsed;
}

async function main() {
  const result = await registerSellerOffer({
    sellerId: process.env.SELLER_ID ?? "local-seller",
    displayName: process.env.SELLER_DISPLAY_NAME ?? "Local Seller Proxy",
    modelId: process.env.SELLER_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    provider: process.env.SELLER_PROVIDER ?? "openai-compatible",
    inputPricePerMTokInf: numberFromEnv("SELLER_INPUT_PRICE_PER_MTOK_INF", 0.05),
    outputPricePerMTokInf: numberFromEnv("SELLER_OUTPUT_PRICE_PER_MTOK_INF", 0.12),
    fixedFeeInf: numberFromEnv("SELLER_FIXED_FEE_INF", 0.01),
    maxBudgetInf: numberFromEnv("SELLER_MAX_BUDGET_INF", 0.5),
    maxInputTokens: numberFromEnv("SELLER_MAX_INPUT_TOKENS", 32_000),
    maxOutputTokens: numberFromEnv("SELLER_MAX_OUTPUT_TOKENS", 4_000),
    x402Endpoint: process.env.SELLER_X402_ENDPOINT ?? "http://localhost:8790/x402",
    hederaAccount: process.env.SELLER_HEDERA_ACCOUNT ?? process.env.HEDERA_OPERATOR_ID ?? "",
    sellerEvmAddress: process.env.SELLER_EVM_ADDRESS ?? process.env.HEDERA_OPERATOR_EVM_ADDRESS,
    summary: process.env.SELLER_SUMMARY ?? "Local seller proxy registered for the live Hedera demo.",
    hfsManifestFileId: process.env.HFS_MARKET_MANIFEST_FILE_ID,
    publishOnChain: process.env.SELLER_PUBLISH_ON_CHAIN !== "false"
  });

  if (result.status === "submitted") {
    await updateEnvFile({
      SELLER_REGISTRY_OFFER_ID: result.registryOfferId,
      SELLER_REGISTRY_TX_ID: result.transactionId,
      SELLER_REGISTRY_HASHSCAN_URL: result.hashScanUrl
    });
  }

  console.log(JSON.stringify(result, null, 2));
  if (result.status === "blocked") {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    status: "fail",
    message: error instanceof Error ? error.message : "Unknown seller registration failure",
    required: [
      "HEDERA_OPERATOR_ID",
      "HEDERA_OPERATOR_KEY",
      "PROXY_REGISTRY_CONTRACT_ID",
      "SELLER_EVM_ADDRESS or HEDERA_OPERATOR_EVM_ADDRESS"
    ]
  }, null, 2));
  process.exit(1);
});
