import { Offer, OfferListSchema } from "@0waist/schemas";

export const SEEDED_OFFERS: Offer[] = OfferListSchema.parse([
  {
    offerId: "offer-alpha-gpt41mini",
    sellerId: "alpha",
    displayName: "Alpha Proxy",
    modelId: "gpt-4.1-mini",
    provider: "openai",
    inputPricePerMTokInf: 0.05,
    outputPricePerMTokInf: 0.12,
    fixedFeeInf: 0.01,
    maxBudgetInf: 0.5,
    proofMode: "direct_zktls_api",
    active: true,
    x402Endpoint: "https://alpha.0waist.local/x402",
    hederaAccount: "0.0.5001",
    summary: "Cheapest compatible seller for low-risk prompts."
  },
  {
    offerId: "offer-beta-gpt41mini",
    sellerId: "beta",
    displayName: "Beta Proxy",
    modelId: "gpt-4.1-mini",
    provider: "openai",
    inputPricePerMTokInf: 0.07,
    outputPricePerMTokInf: 0.14,
    fixedFeeInf: 0.012,
    maxBudgetInf: 0.75,
    proofMode: "direct_zktls_api",
    active: true,
    x402Endpoint: "https://beta.0waist.local/x402",
    hederaAccount: "0.0.5002",
    summary: "Balanced seller with recent successful audit history."
  },
  {
    offerId: "offer-gamma-gpt41mini",
    sellerId: "gamma",
    displayName: "Gamma Proxy",
    modelId: "gpt-4.1-mini",
    provider: "openai",
    inputPricePerMTokInf: 0.09,
    outputPricePerMTokInf: 0.18,
    fixedFeeInf: 0.02,
    maxBudgetInf: 1,
    proofMode: "direct_zktls_api",
    active: true,
    x402Endpoint: "https://gamma.0waist.local/x402",
    hederaAccount: "0.0.5003",
    summary: "Privacy-preferred seller for sensitive routing context."
  }
]);

export function listProxyOffers(): Offer[] {
  return SEEDED_OFFERS;
}

export function getCheapestCompatibleOffer(budgetInf: number, modelId: string): Offer {
  const offer = SEEDED_OFFERS
    .filter((candidate) => candidate.active)
    .filter((candidate) => candidate.modelId === modelId)
    .filter((candidate) => candidate.fixedFeeInf <= budgetInf)
    .sort((a, b) => a.fixedFeeInf - b.fixedFeeInf)[0];

  if (!offer) {
    throw new Error("No compatible active seller offer is within budget");
  }

  return offer;
}
