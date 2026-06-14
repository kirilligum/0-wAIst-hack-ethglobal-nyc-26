import { z } from "zod";
import { promptHash, requestHash, sha256Hex } from "@0waist/crypto";
import {
  createAuditTopic,
  createMarketManifest,
  loadHederaConfig,
  submitAuditMessage
} from "@0waist/hedera";
import { SEEDED_OFFERS } from "./offers.js";
import { updateEnvFile } from "./envFile.js";

export const HederaSetupRequestSchema = z.object({
  operatorId: z.string().regex(/^0\.0\.\d+$/),
  operatorKey: z.string().min(32),
  auditTopicId: z.string().regex(/^0\.0\.\d+$/).optional().or(z.literal("")),
  marketManifestFileId: z.string().regex(/^0\.0\.\d+$/).optional().or(z.literal(""))
});

export type HederaSetupRequest = z.infer<typeof HederaSetupRequestSchema>;

export async function saveAndSeedHedera(input: HederaSetupRequest) {
  const parsed = HederaSetupRequestSchema.parse(input);
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HEDERA_NETWORK: "testnet",
    HEDERA_OPERATOR_ID: parsed.operatorId,
    HEDERA_OPERATOR_KEY: parsed.operatorKey,
    HCS_AUDIT_TOPIC_ID: parsed.auditTopicId || process.env.HCS_AUDIT_TOPIC_ID,
    HFS_MARKET_MANIFEST_FILE_ID: parsed.marketManifestFileId || process.env.HFS_MARKET_MANIFEST_FILE_ID
  };

  await updateEnvFile({
    HEDERA_NETWORK: "testnet",
    HEDERA_OPERATOR_ID: parsed.operatorId,
    HEDERA_OPERATOR_KEY: parsed.operatorKey,
    HCS_AUDIT_TOPIC_ID: env.HCS_AUDIT_TOPIC_ID,
    HFS_MARKET_MANIFEST_FILE_ID: env.HFS_MARKET_MANIFEST_FILE_ID
  });

  const baseConfig = loadHederaConfig(env);
  const topic = baseConfig.auditTopicId
    ? {
      topicId: baseConfig.auditTopicId,
      transactionId: undefined,
      hashScanUrl: `https://hashscan.io/testnet/topic/${baseConfig.auditTopicId}`
    }
    : await createAuditTopic(baseConfig);

  const config = {
    ...baseConfig,
    auditTopicId: topic.topicId
  };

  const manifest = env.HFS_MARKET_MANIFEST_FILE_ID
    ? {
      fileId: env.HFS_MARKET_MANIFEST_FILE_ID,
      transactionId: undefined,
      hashScanUrl: `https://hashscan.io/testnet/file/${env.HFS_MARKET_MANIFEST_FILE_ID}`
    }
    : await createMarketManifest(config, {
      schemaVersion: "0waist.market.v1",
      paymentAsset: "INF",
      network: "hedera-testnet",
      auditTopicId: topic.topicId,
      chainlinkCre: {
        workflowId: env.CRE_WORKFLOW_ID,
        workflowName: env.CRE_WORKFLOW_NAME ?? "0-waist-zktls-verifier",
        donId: env.CRE_DON_ID,
        gatewayUrl: env.CRE_GATEWAY_URL,
        target: env.CRE_TARGET,
        chainSelector: env.CRE_CHAIN_SELECTOR,
        reportReceiver: env.CRE_REPORT_RECEIVER,
        settlementShell: env.CRE_SETTLEMENT_SHELL,
        proofPolicyHash: env.CRE_PROOF_POLICY_HASH
      },
      sellers: SEEDED_OFFERS,
      proofPolicy: {
        mode: "chainlink_cre_zktls",
        publicArtifactPolicy: "hash_only",
        providerPolicyId: env.ZKTLS_PROVIDER_POLICY_ID,
        reclaimProviderId: env.RECLAIM_PROVIDER_ID
      }
    });

  const createdAt = new Date().toISOString();
  const demoPromptHash = promptHash("local setup seed");
  const demoRequestHash = requestHash({
    promptHash: demoPromptHash,
    offerId: "offer-alpha-gpt41mini",
    mode: "quick-buy",
    createdAt
  });
  const audit = await submitAuditMessage(config, {
    type: "DECISION",
    orderId: `setup-${Date.now()}`,
    promptHash: demoPromptHash,
    requestHash: demoRequestHash,
    responseHash: sha256Hex("0waist.setup.seed.response"),
    sellerId: "alpha",
    modelId: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    createdAt,
    schemaVersion: "0waist.audit.v1"
  });

  await updateEnvFile({
    HEDERA_NETWORK: "testnet",
    HEDERA_OPERATOR_ID: parsed.operatorId,
    HEDERA_OPERATOR_KEY: parsed.operatorKey,
    HCS_AUDIT_TOPIC_ID: topic.topicId,
    HFS_MARKET_MANIFEST_FILE_ID: manifest.fileId
  });

  process.env.HEDERA_NETWORK = "testnet";
  process.env.HEDERA_OPERATOR_ID = parsed.operatorId;
  process.env.HEDERA_OPERATOR_KEY = parsed.operatorKey;
  process.env.HCS_AUDIT_TOPIC_ID = topic.topicId;
  process.env.HFS_MARKET_MANIFEST_FILE_ID = manifest.fileId;

  return {
    status: "seeded" as const,
    topic,
    manifest,
    audit,
    savedEnv: [
      "HEDERA_NETWORK",
      "HEDERA_OPERATOR_ID",
      "HEDERA_OPERATOR_KEY",
      "HCS_AUDIT_TOPIC_ID",
      "HFS_MARKET_MANIFEST_FILE_ID"
    ]
  };
}
