import { existsSync } from "node:fs";
import { resolve } from "node:path";
import cors from "cors";
import dotenv from "dotenv";
import express, { type Express } from "express";
import { z } from "zod";
import { x402Readiness } from "@0waist/hedera";
import { EscrowEvidence, EscrowEvidenceSchema, SellerRegistrationRequestSchema } from "@0waist/schemas";

for (const candidate of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
  if (existsSync(candidate)) {
    dotenv.config({ path: candidate, override: false });
    break;
  }
}

const ChatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.union([
    z.string(),
    z.array(z.unknown())
  ])
}).passthrough();

const ChatCompletionRequestSchema = z.object({
  model: z.string().min(1).optional(),
  messages: z.array(ChatMessageSchema).min(1),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
  stream: z.boolean().optional()
}).passthrough();

export interface SellerReadiness {
  status: "ready" | "blocked";
  upstream: {
    ready: boolean;
    provider: "litellm" | "openai" | "missing";
    baseUrl?: string;
    missing: string[];
  };
  payment: {
    ready: boolean;
    network: string;
    asset: "INF";
    missing: string[];
  };
  escrow: {
    ready: boolean;
    missing: string[];
  };
}

export interface X402Challenge {
  x402Version: 1;
  accepts: Array<{
    scheme: "exact";
    network: string;
    asset: "INF";
    payTo: string;
    maxAmountRequired: string;
    resource: string;
    description: string;
  }>;
  requiredEscrowHeaders: string[];
  missingEscrowEvidence?: string[];
  error: string;
}

export function createSellerReadiness(env: NodeJS.ProcessEnv = process.env): SellerReadiness {
  const hasLiteLlm = Boolean(env.LITELLM_BASE_URL);
  const hasLiteLlmKey = Boolean(env.LITELLM_API_KEY);
  const hasOpenAi = Boolean(env.OPENAI_API_KEY);
  const upstreamMissing = hasLiteLlm
    ? (hasLiteLlmKey ? [] : ["LITELLM_API_KEY"])
    : (hasOpenAi ? [] : ["LITELLM_BASE_URL or OPENAI_API_KEY"]);
  const provider = hasLiteLlm ? "litellm" : (hasOpenAi ? "openai" : "missing");
  const payment = x402Readiness(env);
  const escrowMissing = [
    ...(env.PROOF_ESCROW_CONTRACT_ID || env.PROOF_ESCROW_ADDRESS ? [] : ["PROOF_ESCROW_CONTRACT_ID"]),
    ...(env.PROXY_REGISTRY_CONTRACT_ID || env.PROXY_REGISTRY_ADDRESS ? [] : ["PROXY_REGISTRY_CONTRACT_ID"])
  ];

  return {
    status: upstreamMissing.length === 0 && payment.ready && escrowMissing.length === 0 ? "ready" : "blocked",
    upstream: {
      ready: upstreamMissing.length === 0,
      provider,
      baseUrl: hasLiteLlm ? env.LITELLM_BASE_URL : (hasOpenAi ? "https://api.openai.com/v1" : undefined),
      missing: upstreamMissing
    },
    payment: {
      ready: payment.ready,
      network: payment.network,
      asset: payment.paymentAsset,
      missing: payment.missing
    },
    escrow: {
      ready: escrowMissing.length === 0,
      missing: escrowMissing
    }
  };
}

export function buildX402Challenge(env: NodeJS.ProcessEnv = process.env): X402Challenge {
  const offer = SellerRegistrationRequestSchema.partial().parse({
    fixedFeeInf: env.SELLER_FIXED_FEE_INF ? Number(env.SELLER_FIXED_FEE_INF) : undefined,
    maxBudgetInf: env.SELLER_MAX_BUDGET_INF ? Number(env.SELLER_MAX_BUDGET_INF) : undefined,
    x402Endpoint: env.SELLER_X402_ENDPOINT ?? "http://localhost:8790/x402",
    hederaAccount: env.HEDERA_OPERATOR_ID ?? "0.0.0"
  });
  const payTo = env.SELLER_HEDERA_ACCOUNT ?? env.HEDERA_OPERATOR_ID ?? "0.0.0";
  const maxAmountRequired = String(offer.maxBudgetInf ?? offer.fixedFeeInf ?? 0.5);

  return {
    x402Version: 1,
    accepts: [
      {
        scheme: "exact",
        network: env.X402_NETWORK ?? "hedera-testnet",
        asset: "INF",
        payTo,
        maxAmountRequired,
        resource: offer.x402Endpoint ?? "http://localhost:8790/x402",
        description: "Fund a ProofEscrow order in INF before calling this seller proxy."
      }
    ],
    requiredEscrowHeaders: [
      "x-0waist-escrow-order-id",
      "x-0waist-request-hash",
      "x-0waist-proof-escrow"
    ],
    error: "Payment required. Retry with an x402 payment proof or a funded 0-wAIst escrow order header."
  };
}

function upstreamConfig(env: NodeJS.ProcessEnv) {
  if (env.LITELLM_BASE_URL) {
    return {
      baseUrl: env.LITELLM_BASE_URL.replace(/\/+$/, ""),
      apiKey: env.LITELLM_API_KEY,
      model: env.SELLER_MODEL ?? env.OPENAI_MODEL ?? "gpt-4.1-mini"
    };
  }

  return {
    baseUrl: "https://api.openai.com/v1",
    apiKey: env.OPENAI_API_KEY,
    model: env.SELLER_MODEL ?? env.OPENAI_MODEL ?? "gpt-4.1-mini"
  };
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseJsonEvidenceHeader(value: string | undefined): unknown | undefined {
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export type EscrowEvidenceCheck = {
  status: "accepted";
  evidence: EscrowEvidence;
} | {
  status: "blocked";
  missing: string[];
  message: string;
};

export function parseEscrowEvidence(
  headers: Record<string, string | string[] | undefined>,
  env: NodeJS.ProcessEnv = process.env
): EscrowEvidenceCheck {
  const embedded = parseJsonEvidenceHeader(firstHeader(headers["x-0waist-escrow-evidence"]));
  const candidate = embedded ?? {
    orderId: firstHeader(headers["x-0waist-escrow-order-id"]),
    offerId: firstHeader(headers["x-0waist-offer-id"]),
    requestHash: firstHeader(headers["x-0waist-request-hash"]),
    proofEscrowContractIdOrAddress: firstHeader(headers["x-0waist-proof-escrow"]),
    network: firstHeader(headers["x-0waist-network"]) ?? env.X402_NETWORK ?? "hedera-testnet",
    paymentAsset: firstHeader(headers["x-0waist-payment-asset"]) ?? "INF",
    payer: firstHeader(headers["x-0waist-payer"]),
    transactionId: firstHeader(headers["x-0waist-escrow-transaction-id"]),
    hashScanUrl: firstHeader(headers["x-0waist-escrow-hashscan-url"])
  };

  const parsed = EscrowEvidenceSchema.safeParse(candidate);
  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    const missing = Object.entries(flattened)
      .filter(([, messages]) => messages && messages.length > 0)
      .map(([field]) => field);
    return {
      status: "blocked",
      missing: missing.length > 0 ? missing : ["escrowEvidence"],
      message: "Seller proxy requires structured 0-wAIst escrow evidence before forwarding."
    };
  }

  const configuredEscrow = [
    env.PROOF_ESCROW_CONTRACT_ID,
    env.PROOF_ESCROW_ADDRESS
  ].filter((value): value is string => Boolean(value));
  if (
    configuredEscrow.length > 0
    && !configuredEscrow.includes(parsed.data.proofEscrowContractIdOrAddress)
  ) {
    return {
      status: "blocked",
      missing: ["matchingProofEscrow"],
      message: "Escrow evidence targets a different ProofEscrow contract than this seller is configured to accept."
    };
  }

  if ((env.X402_NETWORK ?? "hedera-testnet") !== parsed.data.network) {
    return {
      status: "blocked",
      missing: ["matchingNetwork"],
      message: "Escrow evidence network does not match this seller x402 network."
    };
  }

  return {
    status: "accepted",
    evidence: parsed.data
  };
}

async function forwardChatCompletion(input: {
  env: NodeJS.ProcessEnv;
  body: unknown;
  fetchImpl: typeof fetch;
}) {
  const parsed = ChatCompletionRequestSchema.parse(input.body);
  const upstream = upstreamConfig(input.env);
  if (!upstream.apiKey) {
    return {
      status: 503,
      body: {
        error: {
          code: "SELLER_UPSTREAM_BLOCKED",
          message: "Seller upstream LLM credentials are missing.",
          missing: input.env.LITELLM_BASE_URL ? ["LITELLM_API_KEY"] : ["OPENAI_API_KEY"]
        }
      }
    };
  }

  const response = await input.fetchImpl(`${upstream.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${upstream.apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      ...parsed,
      model: parsed.model ?? upstream.model,
      stream: false
    })
  });
  const responseBody = await response.json();
  return {
    status: response.status,
    body: responseBody
  };
}

export function createSellerApp(
  env: NodeJS.ProcessEnv = process.env,
  deps: { fetchImpl?: typeof fetch } = {}
): Express {
  const app = express();
  const fetchImpl = deps.fetchImpl ?? fetch;
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request, response) => {
    response.json({
      service: "0waist-seller-node",
      readiness: createSellerReadiness(env)
    });
  });

  app.get("/x402", (_request, response) => {
    response.status(402).json(buildX402Challenge(env));
  });

  app.post("/v1/chat/completions", async (request, response) => {
    try {
      const escrowEvidence = parseEscrowEvidence(request.headers, env);
      if (escrowEvidence.status === "blocked") {
        response.status(402).json({
          ...buildX402Challenge(env),
          missingEscrowEvidence: escrowEvidence.missing,
          error: escrowEvidence.message
        });
        return;
      }

      const upstream = await forwardChatCompletion({
        env,
        body: request.body,
        fetchImpl
      });
      response.status(upstream.status).json(upstream.body);
    } catch (error) {
      response.status(400).json({
        error: {
          code: "SELLER_REQUEST_INVALID",
          message: error instanceof Error ? error.message : "Seller proxy request failed"
        }
      });
    }
  });

  return app;
}
