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

const FULL_P0_ENV = [
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
  "X402_PAYMENT_ASSET",
  "ZKTLS_VERIFIER_URL",
  "ZKTLS_PROVIDER_POLICY_ID",
  "VERIFIER_SIGNER_ADDRESS"
];

function missing(keys: string[]): string[] {
  return keys.filter((key) => !process.env[key]);
}

const pathOk = !cwd().startsWith("/mnt/c/");
const minimalMissing = missing(MINIMAL_DEMO_ENV);
const fullMissing = missing(FULL_P0_ENV);
const dynamic = dynamicReadiness(process.env);
const x402 = x402Readiness(process.env);
const scheduledRefund = scheduledRefundReadiness(process.env);
const batchSettlement = batchSettlementReadiness(process.env);
const agentKit = agentKitReadiness();
const hederaMissing = getMissingHederaEnv(process.env);

const result = {
  status: fullMissing.length === 0 && pathOk && agentKit.ready ? "pass" : "fail",
  minimalDemo: {
    ready: minimalMissing.length === 0 && pathOk,
    missing: minimalMissing,
    pathOk,
    hederaMissing
  },
  fullP0: {
    ready: fullMissing.length === 0 && pathOk && agentKit.ready,
    missing: fullMissing,
    dynamic,
    x402,
    scheduledRefund,
    batchSettlement,
    agentKit
  },
  message: minimalMissing.length > 0
    ? "Minimal demo is blocked until OpenAI and Hedera HCS credentials are configured."
    : fullMissing.length > 0 || !agentKit.ready
      ? "Minimal demo credentials are present, but full P0 is still blocked by locked integrations."
      : "Full P0 health checks passed."
};

console.log(JSON.stringify(result, null, 2));

if (result.status !== "pass") {
  process.exit(1);
}
