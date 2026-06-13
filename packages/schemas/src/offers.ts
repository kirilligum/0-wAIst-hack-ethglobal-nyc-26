import { z } from "zod";

export const SellerIdSchema = z.enum(["alpha", "beta", "gamma"]);
export type SellerId = z.infer<typeof SellerIdSchema>;

export const ProofModeSchema = z.enum(["direct_zktls_api"]);
export type ProofMode = z.infer<typeof ProofModeSchema>;

export const OfferSchema = z.object({
  offerId: z.string().min(1),
  sellerId: SellerIdSchema,
  displayName: z.string().min(1),
  modelId: z.string().min(1),
  provider: z.string().min(1),
  inputPricePerMTokInf: z.number().nonnegative(),
  outputPricePerMTokInf: z.number().nonnegative(),
  fixedFeeInf: z.number().nonnegative(),
  maxBudgetInf: z.number().positive(),
  proofMode: ProofModeSchema,
  active: z.boolean(),
  x402Endpoint: z.string().url(),
  hederaAccount: z.string().min(1),
  summary: z.string().min(1)
});
export type Offer = z.infer<typeof OfferSchema>;

export const OfferListSchema = z.array(OfferSchema).min(1);
