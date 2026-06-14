import "dotenv/config";
import { cwd } from "node:process";
import {
  agentKitReadiness,
  batchSettlementReadiness,
  dynamicReadiness,
  getMissingHederaEnv,
  scheduledRefundReadiness,
  x402Readiness
} from "@0waist/hedera";

const MINIMAL_DEMO_ENV = [
  "OPENAI_API_KEY",
  "HEDERA_OPERATOR_ID",
  "HEDERA_OPERATOR_KEY",
  "HCS_AUDIT_TOPIC_ID"
];

const FULL_P0_BASE_ENV = [
  ...MINIMAL_DEMO_ENV,
  "PROXY_REGISTRY_ADDRESS",
  "PROOF_ESCROW_ADDRESS",
  "VERIFIER_REGISTRY_ADDRESS",
  "HTS_INF_TOKEN_ID",
  "HFS_MARKET_MANIFEST_FILE_ID",
  "DYNAMIC_ENVIRONMENT_ID",
  "DYNAMIC_CLIENT_ID",
  "DYNAMIC_WALLET_POLICY_ID",
  "X402_FACILITATOR_URL",
  "X402_NETWORK",
  "X402_PAYMENT_ASSET"
];

const CHAINLINK_CRE_ENV = [
  "RECLAIM_PROVIDER_ID",
  "ZKTLS_VERIFIER_URL",
  "ZKTLS_PROVIDER_POLICY_ID",
  "CRE_WORKFLOW_ID",
  "CRE_DON_ID",
  "CRE_GATEWAY_URL",
  "CRE_TARGET",
  "CRE_CHAIN_SELECTOR",
  "CRE_REPORT_RECEIVER",
  "CRE_SETTLEMENT_SHELL"
];

const LOCAL_VERIFIER_SIGNER_ENV = [
  "VERIFIER_SIGNER_ADDRESS",
  "VERIFIER_SIGNER_PRIVATE_KEY"
];

function missing(keys: string[]): string[] {
  return keys.filter((key) => !process.env[key]);
}

const pathOk = !cwd().startsWith("/mnt/c/");
const minimalMissing = missing(MINIMAL_DEMO_ENV);
const baseMissing = missing(FULL_P0_BASE_ENV);
const chainlinkMissing = missing(CHAINLINK_CRE_ENV);
const localVerifierMissing = missing(LOCAL_VERIFIER_SIGNER_ENV);
if (!(process.env.VERIFIER_REGISTRY_CONTRACT_ID || process.env.VERIFIER_REGISTRY_ADDRESS)) {
  localVerifierMissing.push("VERIFIER_REGISTRY_CONTRACT_ID");
}
const verification = chainlinkMissing.length === 0
  ? {
    ready: true,
    mode: "chainlink-cre",
    missing: [],
    trustBlockedBy: []
  }
  : {
    ready: localVerifierMissing.length === 0,
    mode: localVerifierMissing.length === 0 ? "local-verifier-placeholder" : "blocked",
    missing: localVerifierMissing,
    trustBlockedBy: chainlinkMissing
  };
const fullMissing = [...baseMissing, ...verification.missing];
const dynamic = dynamicReadiness(process.env);
const x402 = x402Readiness(process.env);
const scheduledRefund = scheduledRefundReadiness(process.env);
const batchSettlement = batchSettlementReadiness(process.env);
const agentKit = agentKitReadiness();
const hederaMissing = getMissingHederaEnv(process.env);
const selectedSettlementShell = process.env.CRE_SETTLEMENT_SHELL
  ?? (verification.mode === "local-verifier-placeholder" ? "local-verifier-batch-placeholder" : "unselected");
const creSettlement = {
  selectedShell: selectedSettlementShell,
  directReportReceiver: process.env.CRE_REPORT_RECEIVER,
  chainSelector: process.env.CRE_CHAIN_SELECTOR,
  fallbackBatch: batchSettlement
};
const fullReady = fullMissing.length === 0 && pathOk && agentKit.ready;
const placeholderOnly = verification.mode === "local-verifier-placeholder";

const result = {
  status: fullReady ? "pass" : "fail",
  minimalDemo: {
    ready: minimalMissing.length === 0 && pathOk,
    missing: minimalMissing,
    pathOk,
    hederaMissing
  },
  fullP0: {
    ready: fullReady,
    trustedCreReady: verification.mode === "chainlink-cre",
    missing: fullMissing,
    dynamic,
    x402,
    scheduledRefund,
    verification,
    creSettlement,
    agentKit
  },
  message: minimalMissing.length > 0
    ? "Minimal demo is blocked until OpenAI and Hedera HCS credentials are configured."
    : fullMissing.length > 0 || !agentKit.ready
      ? "Minimal demo credentials are present, but full P0 is still blocked by locked integrations or placeholder-only verification."
      : placeholderOnly
        ? "Demo health checks passed with local verifier placeholder; trusted Chainlink CRE verification remains blocked."
        : "Full P0 health checks passed with trusted Chainlink CRE verification."
};

console.log(JSON.stringify(result, null, 2));

if (result.status !== "pass") {
  process.exit(1);
}
