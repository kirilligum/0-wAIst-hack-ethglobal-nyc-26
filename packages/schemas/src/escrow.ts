import { z } from "zod";

export const Bytes32HexSchema = z.string().regex(/^(0x)?[0-9a-fA-F]{64}$/);

export const EscrowEvidenceSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  offerId: z.coerce.number().int().positive().optional(),
  requestHash: Bytes32HexSchema,
  proofEscrowContractIdOrAddress: z.string().min(1),
  network: z.string().min(1).default("hedera-testnet"),
  paymentAsset: z.literal("INF").default("INF"),
  payer: z.string().min(1).optional(),
  transactionId: z.string().min(1).optional(),
  hashScanUrl: z.string().url().optional()
});
export type EscrowEvidence = z.infer<typeof EscrowEvidenceSchema>;

export const EscrowEvidenceHeaderSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  requestHash: Bytes32HexSchema,
  proofEscrowContractIdOrAddress: z.string().min(1)
});
export type EscrowEvidenceHeader = z.infer<typeof EscrowEvidenceHeaderSchema>;
