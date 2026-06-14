import { z } from "zod";

export const AuditMessageTypeSchema = z.enum([
  "DECISION",
  "RECEIPT",
  "CRE_RECEIPT",
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
  creWorkflowId: z.string().min(1).optional(),
  creDonId: z.string().min(1).optional(),
  creReportHash: z.string().min(64).optional(),
  creReportTxHash: z.string().min(1).optional(),
  proofPolicyHash: z.string().min(64).optional(),
  settlementTransactionId: z.string().min(1).optional(),
  createdAt: z.string().datetime(),
  schemaVersion: z.literal("0waist.audit.v1")
});
export type AuditMessage = z.infer<typeof AuditMessageSchema>;

export const CreVerifiedReceiptSchema = z.object({
  orderId: z.string().min(1),
  requestHash: z.string().min(64),
  responseHash: z.string().min(64),
  modelId: z.string().min(1),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  creWorkflowId: z.string().min(1),
  creDonId: z.string().min(1),
  creReportHash: z.string().min(64),
  proofPolicyHash: z.string().min(64),
  verifiedAt: z.string().datetime()
});
export type CreVerifiedReceipt = z.infer<typeof CreVerifiedReceiptSchema>;

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
