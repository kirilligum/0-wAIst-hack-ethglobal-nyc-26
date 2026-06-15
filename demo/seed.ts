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
      verifierRegistry: process.env.VERIFIER_REGISTRY_ADDRESS,
      creReportReceiver: process.env.CRE_REPORT_RECEIVER
    },
    chainlinkCre: {
      workflowId: process.env.CRE_WORKFLOW_ID,
      workflowName: process.env.CRE_WORKFLOW_NAME ?? "0-waist-zktls-verifier",
      donId: process.env.CRE_DON_ID,
      gatewayUrl: process.env.CRE_GATEWAY_URL,
      target: process.env.CRE_TARGET,
      chainSelector: process.env.CRE_CHAIN_SELECTOR,
      reportReceiver: process.env.CRE_REPORT_RECEIVER,
      settlementShell: process.env.CRE_SETTLEMENT_SHELL,
      proofPolicyHash: process.env.CRE_PROOF_POLICY_HASH
    },
    sellers: SEEDED_OFFERS,
    proofPolicy: {
      mode: "chainlink_cre_zktls",
      publicArtifactPolicy: "hash_only",
      providerPolicyId: process.env.ZKTLS_PROVIDER_POLICY_ID,
      reclaimProviderId: process.env.RECLAIM_PROVIDER_ID
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
    offerId: "offer-alpha-mockllm",
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
    modelId: process.env.MOCK_LLM_MODEL ?? "mock-llm-v1",
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
