import OpenAI from "openai";
import { Offer, RouteDecision } from "@0waist/schemas";
import { CredentialBlocker } from "./errors.js";

export interface LlmGateway {
  answerPrompt(input: { prompt: string; modelId: string }): Promise<string>;
  decideRoute(input: {
    prompt: string;
    budgetInf: number;
    offers: Offer[];
    promptHistorySummaries: string[];
  }): Promise<Pick<RouteDecision, "selectedSellerId" | "reason" | "rejectedAlternatives">>;
}

export function createOpenAiGateway(env: NodeJS.ProcessEnv = process.env): LlmGateway {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new CredentialBlocker(
      "OPENAI_API_KEY is required for real LLM calls.",
      ["OPENAI_API_KEY"],
      "openai"
    );
  }

  const client = new OpenAI({ apiKey });
  const defaultModel = env.OPENAI_MODEL ?? "gpt-4.1-mini";

  return {
    async answerPrompt({ prompt, modelId }) {
      const response = await client.responses.create({
        model: modelId || defaultModel,
        input: [
          {
            role: "system",
            content: "Answer the user's request concisely. Do not mention internal routing, payment, or audit machinery."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      });

      const text = response.output_text?.trim();
      if (!text) {
        throw new Error("OpenAI returned an empty response");
      }
      return text;
    },

    async decideRoute({ prompt, budgetInf, offers, promptHistorySummaries }) {
      const response = await client.chat.completions.create({
        model: defaultModel,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You are the 0-wAIst Router Agent.",
              "Choose exactly one active seller from the provided offers.",
              "Use context and plain reasoning only; do not calculate route scores or weighted formulas.",
              "Return JSON with selectedSellerId, reason, and rejectedAlternatives."
            ].join(" ")
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              budgetInf,
              offers: offers.map((offer) => ({
                sellerId: offer.sellerId,
                offerId: offer.offerId,
                modelId: offer.modelId,
                fixedFeeInf: offer.fixedFeeInf,
                maxBudgetInf: offer.maxBudgetInf,
                summary: offer.summary
              })),
              promptHistorySummaries
            })
          }
        ]
      });

      const content = response.choices[0]?.message.content;
      if (!content) {
        throw new Error("OpenAI did not return a route decision");
      }

      const parsed = JSON.parse(content) as Pick<
        RouteDecision,
        "selectedSellerId" | "reason" | "rejectedAlternatives"
      >;
      if (!parsed.selectedSellerId || !parsed.reason || !Array.isArray(parsed.rejectedAlternatives)) {
        throw new Error("OpenAI route decision did not match the expected JSON shape");
      }
      return parsed;
    }
  };
}
