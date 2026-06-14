import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import {
  createRefundSchedule,
  getSellerHistorySummary,
  loadHederaConfig,
  readMarketManifest
} from "@0waist/hedera";
import { getCheapestCompatibleOffer, listProxyOffers } from "./offers.js";
import { readPromptHistory } from "./promptHistory.js";
import { registerSellerOffer } from "./sellerRegistration.js";
import { getHederaActionStatus, PROOFROUTER_TOOLS } from "./tools.js";

for (const candidate of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
  if (existsSync(candidate)) {
    dotenv.config({ path: candidate, override: false });
    break;
  }
}

function jsonContent(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown MCP tool failure";
}

async function guardedTool(run: () => Promise<unknown> | unknown) {
  try {
    return jsonContent(await run());
  } catch (error) {
    return jsonContent({
      status: "blocked",
      message: errorMessage(error)
    });
  }
}

async function readAuditHistory(env: NodeJS.ProcessEnv) {
  if (!env.HCS_AUDIT_TOPIC_ID) {
    return {
      status: "blocked",
      missing: ["HCS_AUDIT_TOPIC_ID"]
    };
  }

  const network = env.HEDERA_NETWORK ?? "testnet";
  const url = `https://${network}.mirrornode.hedera.com/api/v1/topics/${encodeURIComponent(env.HCS_AUDIT_TOPIC_ID)}/messages?limit=5&order=desc`;
  const response = await fetch(url);
  if (!response.ok) {
    return {
      status: "blocked",
      message: `Mirror Node audit history failed with HTTP ${response.status}`
    };
  }

  const body = await response.json() as {
    messages?: Array<{
      consensus_timestamp?: string;
      sequence_number?: number;
      message?: string;
    }>;
  };

  return {
    status: "ok",
    topicId: env.HCS_AUDIT_TOPIC_ID,
    messages: (body.messages ?? []).map((message) => ({
      sequenceNumber: message.sequence_number,
      consensusTimestamp: message.consensus_timestamp,
      payload: message.message
        ? JSON.parse(Buffer.from(message.message, "base64").toString("utf8"))
        : undefined
    }))
  };
}

export function createProofRouterMcpServer(env: NodeJS.ProcessEnv = process.env): McpServer {
  const server = new McpServer({
    name: "proofrouter-mcp",
    version: "0.1.0"
  });

  server.registerTool("proofrouter.list_proxy_offers", {
    description: "List active proxy seller offers.",
    annotations: { readOnlyHint: true, openWorldHint: false }
  }, () => guardedTool(() => ({
    status: "ok",
    offers: listProxyOffers(env)
  })));

  server.registerTool("proofrouter.get_cheapest_offer", {
    description: "Select the cheapest compatible active seller.",
    inputSchema: {
      budgetInf: z.number().positive(),
      modelId: z.string().default(env.OPENAI_MODEL ?? "gpt-4.1-mini")
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  }, ({ budgetInf, modelId }) => guardedTool(() => ({
    status: "ok",
    offer: getCheapestCompatibleOffer(budgetInf, modelId, env)
  })));

  server.registerTool("proofrouter.get_seller_hedera_history", {
    description: "Read plain-language Mirror Node seller history.",
    inputSchema: {
      sellerAccount: z.string().min(1)
    },
    annotations: { readOnlyHint: true, openWorldHint: true }
  }, ({ sellerAccount }) => guardedTool(async () => ({
    status: "ok",
    history: await getSellerHistorySummary(sellerAccount, env.HEDERA_NETWORK ?? "testnet")
  })));

  server.registerTool("proofrouter.read_market_manifest", {
    description: "Read the single HFS market manifest.",
    annotations: { readOnlyHint: true, openWorldHint: true }
  }, () => guardedTool(async () => ({
    status: "ok",
    manifest: await readMarketManifest(loadHederaConfig(env))
  })));

  server.registerTool("proofrouter.read_hcs_audit_history", {
    description: "Read the single HCS audit topic history.",
    annotations: { readOnlyHint: true, openWorldHint: true }
  }, () => guardedTool(async () => await readAuditHistory(env)));

  server.registerTool("proofrouter.get_buyer_prompt_history", {
    description: "Read encrypted local prompt-history summaries.",
    annotations: { readOnlyHint: true, openWorldHint: false }
  }, () => guardedTool(async () => await readPromptHistory(env)));

  server.registerTool("proofrouter.build_context_packet", {
    description: "Build Router Agent context from offers, history, policy, and manifest.",
    annotations: { readOnlyHint: true, openWorldHint: true }
  }, () => guardedTool(async () => ({
    status: "ok",
    offers: listProxyOffers(env),
    hederaActions: getHederaActionStatus(env),
    promptHistory: await readPromptHistory(env)
  })));

  server.registerTool("proofrouter.open_order_via_x402", {
    description: "Open a Hedera x402-funded order.",
    annotations: { readOnlyHint: false, openWorldHint: true }
  }, () => guardedTool(() => {
    const action = getHederaActionStatus(env).actions.openOrderViaX402;
    return {
      status: action.ready ? "ready" : "blocked",
      missing: action.missing,
      message: action.ready
        ? "x402 order opening is configured, but live buyer wallet execution is not invoked by this read-only smoke path."
        : "x402 order opening is blocked until missing credentials are configured."
    };
  }));

  server.registerTool("proofrouter.create_refund_schedule", {
    description: "Create the scheduled refund transaction.",
    inputSchema: {
      orderId: z.number().int().positive(),
      confirmedFundedOrder: z.boolean().default(false)
    },
    annotations: { readOnlyHint: false, openWorldHint: true }
  }, ({ orderId, confirmedFundedOrder }) => guardedTool(async () => {
    const proofEscrow = env.PROOF_ESCROW_CONTRACT_ID ?? env.PROOF_ESCROW_ADDRESS;
    if (!confirmedFundedOrder || !proofEscrow) {
      return {
        status: "blocked",
        missing: proofEscrow ? ["confirmedFundedOrder"] : ["PROOF_ESCROW_CONTRACT_ID"],
        message: "Refund scheduling requires a real funded ProofEscrow order."
      };
    }
    return {
      status: "submitted",
      schedule: await createRefundSchedule({
        config: loadHederaConfig(env),
        proofEscrowContractIdOrAddress: proofEscrow,
        orderId
      })
    };
  }));

  server.registerTool("proofrouter.publish_seller_offer", {
    description: "Publish a seller offer into ProxyRegistry.",
    inputSchema: {
      sellerId: z.string().min(1),
      displayName: z.string().min(1),
      modelId: z.string().min(1).default(env.OPENAI_MODEL ?? "gpt-4.1-mini"),
      provider: z.string().min(1).default("openai-compatible"),
      x402Endpoint: z.string().url().default("http://localhost:8790/x402"),
      hederaAccount: z.string().min(1),
      sellerEvmAddress: z.string().optional(),
      fixedFeeInf: z.number().nonnegative().default(0.01),
      inputPricePerMTokInf: z.number().nonnegative().default(0.05),
      outputPricePerMTokInf: z.number().nonnegative().default(0.12),
      maxBudgetInf: z.number().positive().default(0.5),
      maxInputTokens: z.number().int().positive().default(32_000),
      maxOutputTokens: z.number().int().positive().default(4_000),
      summary: z.string().min(1).default("Local seller proxy registered for the live Hedera demo."),
      publishOnChain: z.boolean().default(true)
    },
    annotations: { readOnlyHint: false, openWorldHint: true }
  }, (input) => guardedTool(async () => await registerSellerOffer(input, env)));

  const blockedLiveTools = [
    "proofrouter.call_seller_proxy",
    "proofrouter.submit_proof_to_cre",
    "proofrouter.wait_for_cre_report",
    "proofrouter.settle_from_cre_report",
    "proofrouter.log_cre_settlement_audit",
    "proofrouter.get_dynamic_wallet_policy"
  ] as const;

  for (const name of blockedLiveTools) {
    const tool = PROOFROUTER_TOOLS.find((candidate) => candidate.name === name);
    server.registerTool(name, {
      description: tool?.description ?? name,
      annotations: { readOnlyHint: name === "proofrouter.get_dynamic_wallet_policy", openWorldHint: true }
    }, () => guardedTool(() => ({
      status: "blocked",
      hederaActions: getHederaActionStatus(env),
      message: "This live action is blocked until the required external credential path is configured."
    })));
  }

  return server;
}

export async function runStdioMcpServer(): Promise<void> {
  const server = createProofRouterMcpServer();
  await server.connect(new StdioServerTransport());
}

const isEntryPoint = process.argv[1]?.endsWith("mcp.ts") || process.argv[1]?.endsWith("mcp.js");
if (isEntryPoint) {
  runStdioMcpServer().catch((error) => {
    console.error(errorMessage(error));
    process.exit(1);
  });
}
