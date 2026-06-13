import { z } from "zod";

export const AuditMessageTypeSchema = z.enum([
  "DECISION",
  "RECEIPT",
  "TIMEOUT",
  "SETTLEMENT"
]);
export type AuditMessageType = z.infer<typeof AuditMessageTypeSchema>;

export const AuditMessageSchema = z.object({
  type: AuditMessageTypeSchema,
  orderId: z.string().min(1),
  promptHash: z.string().min(64),
  requestHash: z.string().min(64),
  responseHash: z.string().min(64).optional(),
  sellerId: z.string().min(1),
  modelId: z.string().min(1),
  createdAt: z.string().datetime(),
  schemaVersion: z.literal("0waist.audit.v1")
});
export type AuditMessage = z.infer<typeof AuditMessageSchema>;

export const VerifiedReceiptSchema = z.object({
  orderId: z.string().min(1),
  requestHash: z.string().min(64),
  responseHash: z.string().min(64),
  modelId: z.string().min(1),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  verifier: z.string().min(1),
  verifiedAt: z.string().datetime()
});
export type VerifiedReceipt = z.infer<typeof VerifiedReceiptSchema>;
