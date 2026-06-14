import { z } from "zod";

export const ProofRouterToolNameSchema = z.enum([
  "proofrouter.list_proxy_offers",
  "proofrouter.get_cheapest_offer",
  "proofrouter.get_seller_hedera_history",
  "proofrouter.read_market_manifest",
  "proofrouter.read_hcs_audit_history",
  "proofrouter.get_buyer_prompt_history",
  "proofrouter.build_context_packet",
  "proofrouter.open_order_via_x402",
  "proofrouter.create_refund_schedule",
  "proofrouter.call_seller_proxy",
  "proofrouter.wait_for_zktls_receipt",
  "proofrouter.batch_settle_and_log",
  "proofrouter.get_dynamic_wallet_policy",
  "proofrouter.publish_seller_offer"
]);
export type ProofRouterToolName = z.infer<typeof ProofRouterToolNameSchema>;

export const ProofRouterToolSchema = z.object({
  name: ProofRouterToolNameSchema,
  description: z.string().min(1)
});
export type ProofRouterTool = z.infer<typeof ProofRouterToolSchema>;
