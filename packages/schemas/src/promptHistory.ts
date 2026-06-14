import { z } from "zod";

export const PromptHistoryEntrySchema = z.object({
  orderId: z.string().min(1),
  sellerId: z.string().min(1),
  summary: z.string().min(1),
  redactedExcerpt: z.string().min(1),
  promptHash: z.string().min(64),
  createdAt: z.string().datetime()
});
export type PromptHistoryEntry = z.infer<typeof PromptHistoryEntrySchema>;

export const PromptHistoryFileSchema = z.object({
  schemaVersion: z.literal("0waist.promptHistory.v1"),
  entries: z.array(PromptHistoryEntrySchema)
});
export type PromptHistoryFile = z.infer<typeof PromptHistoryFileSchema>;
