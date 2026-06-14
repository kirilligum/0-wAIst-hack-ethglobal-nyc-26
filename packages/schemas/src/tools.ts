import { z } from "zod";

export const ProofRouterToolNameSchema = z.enum([
  "proofrouter.list_proxy_offers",
  "proofrouter.get_cheapest_offer",
  "proofrouter.get_seller_hedera_history",
  "proofrouter.read_market_manifest",
  "proofrouter.read_hcs_audit_history",
  "proofrouter.get_buyer_prompt_history",
  "proofrouter.build_context_packet",
  "proofrouter.approve_inf_allowance",
  "proofrouter.open_order_via_x402",
  "proofrouter.create_refund_schedule",
  "proofrouter.call_seller_proxy",
  "proofrouter.submit_proof_to_cre",
  "proofrouter.wait_for_cre_report",
  "proofrouter.settle_from_cre_report",
  "proofrouter.log_cre_settlement_audit",
  "proofrouter.get_dynamic_wallet_policy",
  "proofrouter.publish_seller_offer"
]);
export type ProofRouterToolName = z.infer<typeof ProofRouterToolNameSchema>;

export const ProofRouterToolSchema = z.object({
  name: ProofRouterToolNameSchema,
  description: z.string().min(1)
});
export type ProofRouterTool = z.infer<typeof ProofRouterToolSchema>;
