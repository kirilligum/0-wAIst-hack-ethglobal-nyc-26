import { createHash } from "node:crypto";
import { Offer, RouteDecision } from "@0waist/schemas";

export const DEFAULT_MOCK_MODEL_ID = "mock-llm-v1";

export interface LlmGateway {
  answerPrompt(input: { prompt: string; modelId: string }): Promise<string>;
  decideRoute(input: {
    prompt: string;
    budgetInf: number;
    offers: Offer[];
    promptHistorySummaries: string[];
  }): Promise<Pick<RouteDecision, "selectedSellerId" | "reason" | "rejectedAlternatives">>;
}

function promptFingerprint(prompt: string): string {
  return createHash("sha256")
    .update(`0waist.mock.prompt:${prompt}`)
    .digest("hex")
    .slice(0, 12);
}

function pickMockRouterOffer(input: {
  budgetInf: number;
  offers: Offer[];
}): Offer {
  const activeOffers = input.offers.filter((offer) => offer.active);
  const affordableOffers = activeOffers.filter((offer) => offer.fixedFeeInf <= input.budgetInf);
  const candidates = affordableOffers.length > 0 ? affordableOffers : activeOffers;
  const selected = candidates.find((offer) => offer.summary.toLowerCase().includes("privacy"))
    ?? candidates[0];
  if (!selected) {
    throw new Error("No active seller offer is available for mock routing");
  }
  return selected;
}

export function createMockLlmGateway(env: NodeJS.ProcessEnv = process.env): LlmGateway {
  return {
    async answerPrompt({ prompt, modelId }) {
      const resolvedModel = modelId || env.MOCK_LLM_MODEL || DEFAULT_MOCK_MODEL_ID;
      return [
        `Mock response generated locally with ${resolvedModel}.`,
        "No OpenAI, LiteLLM, or external LLM provider was called.",
        `Request fingerprint: ${promptFingerprint(prompt)}.`
      ].join(" ");
    },

    async decideRoute({ prompt, budgetInf, offers, promptHistorySummaries }) {
      const selected = pickMockRouterOffer({ budgetInf, offers });
      return {
        selectedSellerId: selected.sellerId,
        reason: [
          `Mock Router Agent selected ${selected.displayName} from the local offer context.`,
          `No external LLM provider was called for prompt ${promptFingerprint(prompt)}.`,
          `Prompt-history summaries considered: ${promptHistorySummaries.length}.`
        ].join(" "),
        rejectedAlternatives: offers
          .filter((offer) => offer.offerId !== selected.offerId)
          .map((offer) => ({
            sellerId: offer.sellerId,
            reason: offer.active && offer.fixedFeeInf <= budgetInf
              ? "Not selected by the post-hackathon mock Router Agent policy."
              : "Not active or outside the buyer budget for this mock route."
          }))
      };
    }
  };
}
