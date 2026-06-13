import { ProofRouterTool } from "@0waist/schemas";

export const PROOFROUTER_TOOLS: ProofRouterTool[] = [
  {
    name: "proofrouter.list_proxy_offers",
    description: "List active proxy seller offers."
  },
  {
    name: "proofrouter.get_cheapest_offer",
    description: "Select the cheapest compatible active seller."
  },
  {
    name: "proofrouter.get_seller_hedera_history",
    description: "Read plain-language Mirror Node seller history."
  },
  {
    name: "proofrouter.read_market_manifest",
    description: "Read the single HFS market manifest."
  },
  {
    name: "proofrouter.read_hcs_audit_history",
    description: "Read the single HCS audit topic history."
  },
  {
    name: "proofrouter.get_buyer_prompt_history",
    description: "Read encrypted local prompt-history summaries."
  },
  {
    name: "proofrouter.build_context_packet",
    description: "Build Router Agent context from offers, history, policy, and manifest."
  },
  {
    name: "proofrouter.open_order_via_x402",
    description: "Open a Hedera x402-funded order."
  },
  {
    name: "proofrouter.create_refund_schedule",
    description: "Create the scheduled refund transaction."
  },
  {
    name: "proofrouter.call_seller_proxy",
    description: "Call the seller proxy after escrow funding."
  },
  {
    name: "proofrouter.wait_for_zktls_receipt",
    description: "Wait for a verified zkTLS receipt."
  },
  {
    name: "proofrouter.batch_settle_and_log",
    description: "Submit settlement and HCS receipt as one Hedera batch."
  },
  {
    name: "proofrouter.get_dynamic_wallet_policy",
    description: "Read the current bounded Dynamic wallet policy."
  }
];
