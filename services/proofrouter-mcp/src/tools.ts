import { ProofRouterTool } from "@0waist/schemas";
import {
  batchSettlementReadiness,
  dynamicReadiness,
  scheduledRefundReadiness,
  x402Readiness
} from "@0waist/hedera";

export const PROOFROUTER_TOOLS: ProofRouterTool[] = [
  {
    name: "proofrouter.list_proxy_offers",
    description: "List active proxy seller offers."
  },
  {
    name: "proofrouter.get_cheapest_offer",
    description: "Select the cheapest compatible active seller."
  },
  {
    name: "proofrouter.get_seller_hedera_history",
    description: "Read plain-language Mirror Node seller history."
  },
  {
    name: "proofrouter.read_market_manifest",
    description: "Read the single HFS market manifest."
  },
  {
    name: "proofrouter.read_hcs_audit_history",
    description: "Read the single HCS audit topic history."
  },
  {
    name: "proofrouter.get_buyer_prompt_history",
    description: "Read encrypted local prompt-history summaries."
  },
  {
    name: "proofrouter.build_context_packet",
    description: "Build Router Agent context from offers, history, policy, and manifest."
  },
  {
    name: "proofrouter.open_order_via_x402",
    description: "Open a Hedera x402-funded order."
  },
  {
    name: "proofrouter.create_refund_schedule",
    description: "Create the scheduled refund transaction."
  },
  {
    name: "proofrouter.call_seller_proxy",
    description: "Call the seller proxy after escrow funding."
  },
  {
    name: "proofrouter.wait_for_zktls_receipt",
    description: "Wait for a verified zkTLS receipt."
  },
  {
    name: "proofrouter.batch_settle_and_log",
    description: "Submit settlement and HCS receipt as one Hedera batch."
  },
  {
    name: "proofrouter.get_dynamic_wallet_policy",
    description: "Read the current bounded Dynamic wallet policy."
  }
];

function missing(keys: string[], env: NodeJS.ProcessEnv): string[] {
  return keys.filter((key) => !env[key]);
}

export function getHederaActionStatus(env: NodeJS.ProcessEnv = process.env) {
  const contractMissing = [
    ...(env.PROXY_REGISTRY_CONTRACT_ID || env.PROXY_REGISTRY_ADDRESS ? [] : ["PROXY_REGISTRY_CONTRACT_ID"]),
    ...(env.PROOF_ESCROW_CONTRACT_ID || env.PROOF_ESCROW_ADDRESS ? [] : ["PROOF_ESCROW_CONTRACT_ID"]),
    ...(env.VERIFIER_REGISTRY_CONTRACT_ID || env.VERIFIER_REGISTRY_ADDRESS ? [] : ["VERIFIER_REGISTRY_CONTRACT_ID"])
  ];
  const infMissing = missing(["HTS_INF_TOKEN_ID"], env);
  const dynamic = dynamicReadiness(env);
  const x402 = x402Readiness(env);
  const scheduledRefund = scheduledRefundReadiness(env);
  const batchSettlement = batchSettlementReadiness(env);

  return {
    tools: PROOFROUTER_TOOLS,
    prerequisites: {
      contracts: {
        ready: contractMissing.length === 0,
        missing: contractMissing
      },
      inf: {
        ready: infMissing.length === 0,
        missing: infMissing
      },
      dynamic,
      x402
    },
    actions: {
      openOrderViaX402: {
        ready: contractMissing.length === 0 && infMissing.length === 0 && dynamic.ready && x402.ready,
        missing: [...contractMissing, ...infMissing, ...dynamic.missing, ...x402.missing],
        tool: "proofrouter.open_order_via_x402"
      },
      createRefundSchedule: {
        ...scheduledRefund,
        tool: "proofrouter.create_refund_schedule"
      },
      batchSettleAndLog: {
        ...batchSettlement,
        tool: "proofrouter.batch_settle_and_log"
      }
    }
  };
}
