import { ProofRouterTool } from "@0waist/schemas";
import {
  batchSettlementReadiness,
  dynamicReadiness,
  openOrderReadiness,
  proxyRegistryReadiness,
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
    name: "proofrouter.submit_proof_to_cre",
    description: "Submit a compact zkTLS proof presentation to the deployed Chainlink CRE workflow."
  },
  {
    name: "proofrouter.wait_for_cre_report",
    description: "Wait for a Chainlink CRE DON report for the order proof."
  },
  {
    name: "proofrouter.settle_from_cre_report",
    description: "Settle or authorize ProofEscrow from a CRE-authenticated report."
  },
  {
    name: "proofrouter.log_cre_settlement_audit",
    description: "Write the HCS CRE_RECEIPT audit message for the selected settlement."
  },
  {
    name: "proofrouter.get_dynamic_wallet_policy",
    description: "Read the current bounded Dynamic wallet policy."
  },
  {
    name: "proofrouter.publish_seller_offer",
    description: "Publish a seller offer into ProxyRegistry."
  }
];

function missing(keys: string[], env: NodeJS.ProcessEnv): string[] {
  return keys.filter((key) => !env[key]);
}

function creProofReadiness(env: NodeJS.ProcessEnv) {
  const chainlinkMissing = missing([
    "RECLAIM_PROVIDER_ID",
    "ZKTLS_VERIFIER_URL",
    "ZKTLS_PROVIDER_POLICY_ID",
    "CRE_WORKFLOW_ID",
    "CRE_DON_ID",
    "CRE_GATEWAY_URL",
    "CRE_TARGET"
  ], env);
  const placeholderMissing = missing([
    "VERIFIER_SIGNER_ADDRESS",
    "VERIFIER_SIGNER_PRIVATE_KEY"
  ], env);
  if (!(env.VERIFIER_REGISTRY_CONTRACT_ID || env.VERIFIER_REGISTRY_ADDRESS)) {
    placeholderMissing.push("VERIFIER_REGISTRY_CONTRACT_ID");
  }

  if (chainlinkMissing.length === 0) {
    return {
      ready: true,
      missing: [],
      mode: "chainlink-cre",
      workflowId: env.CRE_WORKFLOW_ID,
      donId: env.CRE_DON_ID,
      gatewayUrl: env.CRE_GATEWAY_URL,
      target: env.CRE_TARGET,
      blockedTrust: []
    };
  }

  return {
    ready: placeholderMissing.length === 0,
    missing: placeholderMissing,
    mode: placeholderMissing.length === 0 ? "local-verifier-placeholder" : "blocked",
    workflowId: env.CRE_WORKFLOW_ID,
    donId: env.CRE_DON_ID,
    gatewayUrl: env.CRE_GATEWAY_URL,
    target: env.CRE_TARGET,
    blockedTrust: chainlinkMissing
  };
}

function creSettlementReadiness(env: NodeJS.ProcessEnv) {
  const batchSettlement = batchSettlementReadiness(env);
  const shell = env.CRE_SETTLEMENT_SHELL;
  const proof = creProofReadiness(env);
  const placeholderShell = proof.mode === "local-verifier-placeholder" ? "local-verifier-batch-placeholder" : undefined;
  const selectedShell = shell ?? placeholderShell;
  const missingKeys = [
    ...missing([
      "CRE_WORKFLOW_ID",
      "CRE_DON_ID",
      "CRE_CHAIN_SELECTOR",
      "CRE_REPORT_RECEIVER",
      "CRE_SETTLEMENT_SHELL"
    ], env),
    ...(selectedShell === "hedera-batch" || selectedShell === "local-verifier-batch-placeholder" ? batchSettlement.missing : []),
    ...(selectedShell === "local-verifier-batch-placeholder" ? proof.missing : []),
    ...(selectedShell === "direct-cre-report" && !(env.PROOF_ESCROW_CONTRACT_ID || env.PROOF_ESCROW_ADDRESS)
      ? ["PROOF_ESCROW_CONTRACT_ID"]
      : [])
  ].filter((key) => selectedShell === "local-verifier-batch-placeholder"
    ? !["CRE_WORKFLOW_ID", "CRE_DON_ID", "CRE_CHAIN_SELECTOR", "CRE_REPORT_RECEIVER", "CRE_SETTLEMENT_SHELL"].includes(key)
    : true);

  return {
    ready: missingKeys.length === 0 && (
      selectedShell === "direct-cre-report"
      || selectedShell === "hedera-batch"
      || selectedShell === "local-verifier-batch-placeholder"
    ),
    missing: Array.from(new Set(missingKeys)),
    shell: selectedShell ?? "unselected",
    mode: proof.mode,
    requiredActions: selectedShell === "local-verifier-batch-placeholder"
      ? ["Local verifier receipt", "ProofEscrow.settle", "HCS.RECEIPT"]
      : selectedShell === "hedera-batch"
      ? ["CRE report verification", "ProofEscrow.settle", "HCS.CRE_RECEIPT"]
      : ["CRE report verification", "ProofEscrow.settleFromCreReport", "HCS.CRE_RECEIPT"]
  };
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
  const openOrder = openOrderReadiness(env);
  const scheduledRefund = scheduledRefundReadiness(env);
  const creProof = creProofReadiness(env);
  const creSettlement = creSettlementReadiness(env);
  const sellerRegistry = proxyRegistryReadiness(env);

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
      x402,
      creProof,
      creSettlement,
      sellerRegistry
    },
    actions: {
      openOrderViaX402: {
        ready: openOrder.ready && contractMissing.length === 0 && dynamic.ready && x402.ready,
        missing: Array.from(new Set([...openOrder.missing, ...contractMissing, ...dynamic.missing, ...x402.missing])),
        tool: "proofrouter.open_order_via_x402"
      },
      createRefundSchedule: {
        ...scheduledRefund,
        tool: "proofrouter.create_refund_schedule"
      },
      submitProofToCre: {
        ...creProof,
        tool: "proofrouter.submit_proof_to_cre"
      },
      waitForCreReport: {
        ...creProof,
        tool: "proofrouter.wait_for_cre_report"
      },
      settleFromCreReport: {
        ...creSettlement,
        tool: "proofrouter.settle_from_cre_report"
      },
      logCreSettlementAudit: {
        ready: creSettlement.ready && Boolean(env.HCS_AUDIT_TOPIC_ID),
        missing: Array.from(new Set([
          ...creSettlement.missing,
          ...(!env.HCS_AUDIT_TOPIC_ID ? ["HCS_AUDIT_TOPIC_ID"] : [])
        ])),
        tool: "proofrouter.log_cre_settlement_audit",
        requiredActions: ["HCS.CRE_RECEIPT"]
      },
      publishSellerOffer: {
        ...sellerRegistry,
        tool: "proofrouter.publish_seller_offer"
      }
    }
  };
}
