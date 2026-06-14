import { z } from "zod";

export const SellerIdSchema = z.string().min(1).max(64).regex(/^[a-z0-9][a-z0-9-]*$/);
export type SellerId = z.infer<typeof SellerIdSchema>;

export const ProofModeSchema = z.enum(["chainlink_cre_zktls"]);
export type ProofMode = z.infer<typeof ProofModeSchema>;

export const RegistryStatusSchema = z.enum(["seeded", "local", "submitted", "blocked"]);
export type RegistryStatus = z.infer<typeof RegistryStatusSchema>;

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
  summary: z.string().min(1),
  registryStatus: RegistryStatusSchema.default("seeded"),
  registryOfferId: z.string().min(1).optional(),
  registryTransactionId: z.string().min(1).optional(),
  registryHashScanUrl: z.string().url().optional()
});
export type Offer = z.infer<typeof OfferSchema>;

export const OfferListSchema = z.array(OfferSchema).min(1);

export const EvmAddressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/);

export const SellerRegistrationRequestSchema = z.object({
  sellerId: SellerIdSchema.default("local-seller"),
  displayName: z.string().min(1).max(80).default("Local Seller Proxy"),
  modelId: z.string().min(1).max(120).default("gpt-4.1-mini"),
  provider: z.string().min(1).max(80).default("openai-compatible"),
  inputPricePerMTokInf: z.number().nonnegative().max(100).default(0.05),
  outputPricePerMTokInf: z.number().nonnegative().max(100).default(0.12),
  fixedFeeInf: z.number().nonnegative().max(100).default(0.01),
  maxBudgetInf: z.number().positive().max(100).default(0.5),
  maxInputTokens: z.number().int().positive().max(1_000_000).default(32_000),
  maxOutputTokens: z.number().int().positive().max(1_000_000).default(4_000),
  x402Endpoint: z.string().url().default("http://localhost:8790/x402"),
  hederaAccount: z.string().min(1),
  sellerEvmAddress: EvmAddressSchema.optional(),
  summary: z.string().min(1).max(240).default("Local seller proxy registered for the live Hedera demo."),
  validUntilEpochSeconds: z.number().int().positive().optional(),
  hfsManifestFileId: z.string().min(1).optional(),
  publishOnChain: z.boolean().default(true)
});
export type SellerRegistrationRequest = z.infer<typeof SellerRegistrationRequestSchema>;

export const SellerRegistrationResultSchema = z.object({
  status: z.enum(["submitted", "local", "blocked"]),
  offer: OfferSchema,
  missing: z.array(z.string()).default([]),
  transactionId: z.string().min(1).optional(),
  hashScanUrl: z.string().url().optional(),
  registryOfferId: z.string().min(1).optional(),
  message: z.string().min(1)
});
export type SellerRegistrationResult = z.infer<typeof SellerRegistrationResultSchema>;
