import "dotenv/config";
import {
  createOrLoadAuditTopic,
  createOrLoadInfToken,
  createOrUpdateMarketManifest,
  loadHederaConfig,
  submitAuditMessage
} from "@0waist/hedera";
import { promptHash, requestHash, sha256Hex } from "@0waist/crypto";
import { SEEDED_OFFERS } from "../services/proofrouter-mcp/src/offers.js";

async function main() {
  const baseConfig = loadHederaConfig(process.env);
  const inf = await createOrLoadInfToken(baseConfig);
  const topic = await createOrLoadAuditTopic(baseConfig);

  const config = {
    ...baseConfig,
    auditTopicId: topic.topicId,
    infTokenId: inf.tokenId
  };

  const manifest = await createOrUpdateMarketManifest(config, {
    schemaVersion: "0waist.market.v1",
    paymentAsset: "INF",
    network: "hedera-testnet",
    infTokenId: inf.tokenId,
    auditTopicId: topic.topicId,
    mcpEndpoint: process.env.MCP_PUBLIC_URL ?? "http://localhost:8787/mcp",
    x402: {
      network: "hedera-testnet",
      paymentAsset: "INF",
      facilitatorUrl: process.env.X402_FACILITATOR_URL
    },
    contracts: {
      proxyRegistry: process.env.PROXY_REGISTRY_ADDRESS,
      proofEscrow: process.env.PROOF_ESCROW_ADDRESS,
      verifierRegistry: process.env.VERIFIER_REGISTRY_ADDRESS
    },
    sellers: SEEDED_OFFERS,
    proofPolicy: {
      mode: "direct_zktls_api",
      publicArtifactPolicy: "hash_only",
      providerPolicyId: process.env.ZKTLS_PROVIDER_POLICY_ID
    },
    serviceMetadata: {
      serviceId: "0-waist",
      agentId: "0waist.proofrouter",
      serviceKind: "ai_subscription_proxy_router"
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
    inf,
    manifest,
    audit,
    envToAdd: {
      HCS_AUDIT_TOPIC_ID: topic.topicId,
      HFS_MARKET_MANIFEST_FILE_ID: manifest.fileId,
      HTS_INF_TOKEN_ID: inf.tokenId,
      HTS_INF_TOKEN_EVM_ADDRESS: inf.evmAddress
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
