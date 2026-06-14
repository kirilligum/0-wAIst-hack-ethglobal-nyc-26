import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { Offer, OfferListSchema, OfferSchema } from "@0waist/schemas";
import { demoSellerEnsName } from "./ens.js";

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
    proofMode: "chainlink_cre_zktls",
    active: true,
    x402Endpoint: "https://alpha.0waist.local/x402",
    hederaAccount: "0.0.5001",
    summary: "Cheapest compatible seller for low-risk prompts.",
    registryStatus: "seeded"
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
    proofMode: "chainlink_cre_zktls",
    active: true,
    x402Endpoint: "https://beta.0waist.local/x402",
    hederaAccount: "0.0.5002",
    summary: "Balanced seller with recent successful audit history.",
    registryStatus: "seeded"
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
    proofMode: "chainlink_cre_zktls",
    active: true,
    x402Endpoint: "https://gamma.0waist.local/x402",
    hederaAccount: "0.0.5003",
    summary: "Privacy-preferred seller for sensitive routing context.",
    registryStatus: "seeded"
  }
]);

const RegisteredOfferListSchema = z.array(OfferSchema);

export function registeredOffersPath(env: NodeJS.ProcessEnv = process.env): string {
  if (env.REGISTERED_OFFERS_FILE) {
    return resolve(process.cwd(), env.REGISTERED_OFFERS_FILE);
  }
  const workspaceRootFromPackage = resolve(process.cwd(), "../../pnpm-workspace.yaml");
  return existsSync(workspaceRootFromPackage)
    ? resolve(process.cwd(), "../../.local/seller-offers.json")
    : resolve(process.cwd(), ".local/seller-offers.json");
}

export function readRegisteredOffers(env: NodeJS.ProcessEnv = process.env): Offer[] {
  const path = registeredOffersPath(env);
  if (!existsSync(path)) {
    return [];
  }
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const normalized = Array.isArray(parsed)
    ? parsed.map((offer) => ({
      ...offer,
      proofMode: offer.proofMode === "direct_zktls_api" ? "chainlink_cre_zktls" : offer.proofMode
    }))
    : parsed;
  return RegisteredOfferListSchema.parse(normalized);
}

function mergeOffers(offers: Offer[]): Offer[] {
  const byId = new Map<string, Offer>();
  for (const offer of offers) {
    byId.set(offer.offerId, offer);
  }
  return [...byId.values()];
}

function withDemoSellerEns(offer: Offer, env: NodeJS.ProcessEnv): Offer {
  if (offer.sellerEnsName) {
    return offer;
  }
  const localSellerId = env.SELLER_ID ?? "local-seller";
  if (offer.sellerId !== localSellerId && !offer.offerId.startsWith("registry-")) {
    return offer;
  }
  return {
    ...offer,
    sellerEnsName: demoSellerEnsName(env)
  };
}

export function listProxyOffers(env: NodeJS.ProcessEnv = process.env): Offer[] {
  return OfferListSchema.parse(mergeOffers([...SEEDED_OFFERS, ...readRegisteredOffers(env)])
    .map((offer) => withDemoSellerEns(offer, env)));
}

export async function upsertRegisteredOffer(
  offer: Offer,
  env: NodeJS.ProcessEnv = process.env
): Promise<Offer[]> {
  const path = registeredOffersPath(env);
  const offers = mergeOffers([
    ...readRegisteredOffers(env).filter((candidate) => candidate.offerId !== offer.offerId),
    OfferSchema.parse(offer)
  ]);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(offers, null, 2)}\n`, "utf8");
  return offers;
}

export function getCheapestCompatibleOffer(
  budgetInf: number,
  modelId: string,
  env: NodeJS.ProcessEnv = process.env
): Offer {
  const offer = listProxyOffers(env)
    .filter((candidate) => candidate.active)
    .filter((candidate) => candidate.modelId === modelId)
    .filter((candidate) => candidate.fixedFeeInf <= budgetInf)
    .sort((a, b) => a.fixedFeeInf - b.fixedFeeInf)[0];

  if (!offer) {
    throw new Error("No compatible active seller offer is within budget");
  }

  return offer;
}
