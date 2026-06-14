import { z } from "zod";
import { OfferSchema } from "./offers.js";

export const OrderModeSchema = z.enum(["quick-buy", "router-agent"]);
export type OrderMode = z.infer<typeof OrderModeSchema>;

export const OrderRequestSchema = z.object({
  prompt: z.string().min(1).max(8000),
  budgetInf: z.number().positive().max(10),
  mode: OrderModeSchema
});
export type OrderRequest = z.infer<typeof OrderRequestSchema>;

export const RouteDecisionSchema = z.object({
  mode: OrderModeSchema,
  selectedSellerId: z.string().min(1),
  selectedOfferId: z.string().min(1),
  reason: z.string().min(1),
  rejectedAlternatives: z.array(
    z.object({
      sellerId: z.string().min(1),
      reason: z.string().min(1)
    })
  )
});
export type RouteDecision = z.infer<typeof RouteDecisionSchema>;

export const HederaAuditStatusSchema = z.object({
  status: z.enum(["submitted", "blocked"]),
  topicId: z.string().optional(),
  transactionId: z.string().optional(),
  hashScanUrl: z.string().url().optional(),
  missing: z.array(z.string()).default([])
});
export type HederaAuditStatus = z.infer<typeof HederaAuditStatusSchema>;

export const OrderResultSchema = z.object({
  orderId: z.string().min(1),
  mode: OrderModeSchema,
  selectedOffer: OfferSchema,
  decision: RouteDecisionSchema,
  answer: z.string().min(1),
  promptHash: z.string().min(64),
  requestHash: z.string().min(64),
  responseHash: z.string().min(64),
  traceDir: z.string().min(1),
  hederaAudit: HederaAuditStatusSchema,
  proofStatus: z.string().min(1),
  paymentStatus: z.string().min(1),
  timeline: z.array(
    z.object({
      label: z.string().min(1),
      status: z.enum(["done", "blocked", "pending"]),
      detail: z.string().min(1)
    })
  )
});
export type OrderResult = z.infer<typeof OrderResultSchema>;
