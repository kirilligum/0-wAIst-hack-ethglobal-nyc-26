import "dotenv/config";
import {
  createAuditTopic,
  createMarketManifest,
  loadHederaConfig,
  submitAuditMessage
} from "@0waist/hedera";
import { promptHash, requestHash, sha256Hex } from "@0waist/crypto";
import { SEEDED_OFFERS } from "../services/proofrouter-mcp/src/offers.js";

async function main() {
  const baseConfig = loadHederaConfig(process.env);
  const topic = baseConfig.auditTopicId
    ? { topicId: baseConfig.auditTopicId, transactionId: undefined, hashScanUrl: undefined }
    : await createAuditTopic(baseConfig);

  const config = {
    ...baseConfig,
    auditTopicId: topic.topicId
  };

  const manifest = process.env.HFS_MARKET_MANIFEST_FILE_ID
    ? { fileId: process.env.HFS_MARKET_MANIFEST_FILE_ID, transactionId: undefined, hashScanUrl: undefined }
    : await createMarketManifest(config, {
      schemaVersion: "0waist.market.v1",
      paymentAsset: "INF",
      network: "hedera-testnet",
      auditTopicId: topic.topicId,
      sellers: SEEDED_OFFERS,
      proofPolicy: {
        mode: "direct_zktls_api",
        publicArtifactPolicy: "hash_only"
      }
    });

  const createdAt = new Date().toISOString();
  const demoPromptHash = promptHash("demo seed");
  const demoRequestHash = requestHash({
    promptHash: demoPromptHash,
    offerId: "offer-alpha-gpt41mini",
    mode: "quick-buy",
    createdAt
  });
  const audit = await submitAuditMessage(config, {
    type: "DECISION",
    orderId: `seed-${Date.now()}`,
    promptHash: demoPromptHash,
    requestHash: demoRequestHash,
    responseHash: sha256Hex("0waist.seed.response"),
    sellerId: "alpha",
    modelId: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    createdAt,
    schemaVersion: "0waist.audit.v1"
  });

  console.log(JSON.stringify({
    status: "seeded",
    topic,
    manifest,
    audit,
    envToAdd: {
      HCS_AUDIT_TOPIC_ID: topic.topicId,
      HFS_MARKET_MANIFEST_FILE_ID: manifest.fileId
    }
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    status: "fail",
    message: error instanceof Error ? error.message : "Unknown seed failure",
    required: ["HEDERA_OPERATOR_ID", "HEDERA_OPERATOR_KEY"]
  }, null, 2));
  process.exit(1);
});
