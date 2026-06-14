import { randomUUID } from "node:crypto";
import { promptHash as makePromptHash, redactPrompt, requestHash as makeRequestHash, sha256Hex } from "@0waist/crypto";
import {
  AuditMessage,
  HederaAuditStatus,
  Offer,
  OrderRequest,
  OrderRequestSchema,
  OrderResult,
  RouteDecision
} from "@0waist/schemas";
import {
  getMissingHederaEnv,
  loadHederaConfig,
  submitAuditMessage
} from "@0waist/hedera";
import { createOpenAiGateway, LlmGateway } from "./llm.js";
import { getCheapestCompatibleOffer, listProxyOffers } from "./offers.js";
import { appendPromptHistory, buildHistoryEntry, readPromptHistory } from "./promptHistory.js";
import { writeOrderTrace } from "./trace.js";

export interface WorkflowDeps {
  llm?: LlmGateway;
  submitAudit?: (message: AuditMessage) => Promise<HederaAuditStatus>;
  env?: NodeJS.ProcessEnv;
}

function makeOrderId(): string {
  return `order-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
}

function proofStatusForEnv(env: NodeJS.ProcessEnv): string {
  if (env.CRE_WORKFLOW_ID && env.CRE_DON_ID) {
    return "Provider response hash recorded; Chainlink CRE zkTLS report configuration is present.";
  }
  if (
    env.VERIFIER_SIGNER_ADDRESS
    && env.VERIFIER_SIGNER_PRIVATE_KEY
    && (env.VERIFIER_REGISTRY_CONTRACT_ID || env.VERIFIER_REGISTRY_ADDRESS)
  ) {
    return "Provider response hash recorded; local verifier placeholder is configured while Chainlink CRE login is blocked.";
  }
  return "Provider response hash recorded; proof verification is blocked.";
}

function buildQuickBuyDecision(selectedOffer: Offer, offers: Offer[]): RouteDecision {
  return {
    mode: "quick-buy",
    selectedSellerId: selectedOffer.sellerId,
    selectedOfferId: selectedOffer.offerId,
    reason: "Quick Buy selected the cheapest compatible active seller within budget.",
    rejectedAlternatives: offers
      .filter((offer) => offer.offerId !== selectedOffer.offerId)
      .map((offer) => ({
        sellerId: offer.sellerId,
        reason: "Higher fixed INF fee than the selected compatible offer."
      }))
  };
}

async function buildRouterDecision(input: {
  llm: LlmGateway;
  prompt: string;
  budgetInf: number;
  offers: Offer[];
  promptHistorySummaries: string[];
}): Promise<RouteDecision> {
  const decision = await input.llm.decideRoute(input);
  const selectedOffer = input.offers.find((offer) => offer.sellerId === decision.selectedSellerId);
  if (!selectedOffer) {
    throw new Error(`Router Agent selected unknown seller: ${decision.selectedSellerId}`);
  }

  return {
    mode: "router-agent",
    selectedSellerId: selectedOffer.sellerId,
    selectedOfferId: selectedOffer.offerId,
    reason: decision.reason,
    rejectedAlternatives: decision.rejectedAlternatives
  };
}

async function submitAuditWithEnvironment(
  message: AuditMessage,
  env: NodeJS.ProcessEnv
): Promise<HederaAuditStatus> {
  const missing = [...getMissingHederaEnv(env)];
  if (!env.HCS_AUDIT_TOPIC_ID) {
    missing.push("HCS_AUDIT_TOPIC_ID");
  }
  if (missing.length > 0) {
    return {
      status: "blocked",
      missing
    };
  }

  const config = loadHederaConfig(env);
  const result = await submitAuditMessage(config, message);
  return {
    status: "submitted",
    topicId: result.topicId,
    transactionId: result.transactionId,
    hashScanUrl: result.hashScanUrl,
    missing: []
  };
}

export async function executeInferenceOrder(
  request: OrderRequest,
  deps: WorkflowDeps = {}
): Promise<OrderResult> {
  const parsedRequest = OrderRequestSchema.parse(request);
  const env = deps.env ?? process.env;
  const llm = deps.llm ?? createOpenAiGateway(env);
  const offers = listProxyOffers(env);
  const modelId = env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const createdAt = new Date().toISOString();
  const orderId = makeOrderId();
  const promptHash = makePromptHash(parsedRequest.prompt);
  const history = await readPromptHistory(env);
  const promptHistorySummaries = history.entries.map((entry) => entry.summary);

  const decision = parsedRequest.mode === "quick-buy"
    ? buildQuickBuyDecision(
      getCheapestCompatibleOffer(parsedRequest.budgetInf, modelId, env),
      offers
    )
    : await buildRouterDecision({
      llm,
      prompt: parsedRequest.prompt,
      budgetInf: parsedRequest.budgetInf,
      offers,
      promptHistorySummaries
    });

  const selectedOffer = offers.find((offer) => offer.offerId === decision.selectedOfferId);
  if (!selectedOffer) {
    throw new Error("Selected offer disappeared from the marketplace");
  }

  const requestHash = makeRequestHash({
    promptHash,
    offerId: selectedOffer.offerId,
    mode: parsedRequest.mode,
    createdAt
  });

  const answer = await llm.answerPrompt({
    prompt: parsedRequest.prompt,
    modelId: selectedOffer.modelId
  });
  const responseHash = sha256Hex(`0waist.response.v1:${answer}`);

  const auditMessage: AuditMessage = {
    type: "RECEIPT",
    orderId,
    promptHash,
    requestHash,
    responseHash,
    sellerId: selectedOffer.sellerId,
    modelId: selectedOffer.modelId,
    createdAt,
    schemaVersion: "0waist.audit.v1"
  };

  const hederaAudit = deps.submitAudit
    ? await deps.submitAudit(auditMessage)
    : await submitAuditWithEnvironment(auditMessage, env);

  await appendPromptHistory(
    buildHistoryEntry({
      orderId,
      sellerId: selectedOffer.sellerId,
      prompt: parsedRequest.prompt,
      promptHash,
      createdAt
    }),
    env
  );

  const resultWithoutTrace: OrderResult = {
    orderId,
    mode: parsedRequest.mode,
    selectedOffer,
    decision,
    answer,
    promptHash,
    requestHash,
    responseHash,
    traceDir: "",
    hederaAudit,
    proofStatus: proofStatusForEnv(env),
    paymentStatus: hederaAudit.status === "submitted"
      ? "Hash-only Hedera audit submitted; x402 INF escrow is still blocked."
      : `Hedera audit blocked: ${hederaAudit.missing.join(", ")}`,
    timeline: [
      {
        label: "Seller selected",
        status: "done",
        detail: `${selectedOffer.displayName} selected for ${parsedRequest.mode}.`
      },
      {
        label: "OpenAI call",
        status: "done",
        detail: "Answer generated by the configured OpenAI model."
      },
      {
        label: "Hedera HCS audit",
        status: hederaAudit.status === "submitted" ? "done" : "blocked",
        detail: hederaAudit.status === "submitted"
          ? "Hash-only receipt audit message submitted to Hedera Testnet."
          : `Missing ${hederaAudit.missing.join(", ")}.`
      },
      {
        label: "Prompt privacy",
        status: "done",
        detail: `Stored redacted excerpt only: ${redactPrompt(parsedRequest.prompt)}`
      }
    ]
  };

  const traceDir = await writeOrderTrace({
    orderId,
    prompt: parsedRequest.prompt,
    promptHash,
    requestHash,
    responseHash,
    selectedOffer,
    result: resultWithoutTrace,
    createdAt
  });

  return {
    ...resultWithoutTrace,
    traceDir
  };
}
