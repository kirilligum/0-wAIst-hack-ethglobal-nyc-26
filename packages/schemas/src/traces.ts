import { z } from "zod";

export const PublicTraceSchema = z.object({
  orderId: z.string().min(1),
  promptHash: z.string().min(64),
  requestHash: z.string().min(64),
  responseHash: z.string().min(64).optional(),
  redactedPromptExcerpt: z.string().min(1),
  selectedSellerId: z.string().min(1),
  hederaTransactionId: z.string().optional(),
  createdAt: z.string().datetime()
});
export type PublicTrace = z.infer<typeof PublicTraceSchema>;
