export interface AgentActionContext {
  budgetInf: number;
  maxBudgetInf: number;
  escrowFunded: boolean;
  receiptVerified: boolean;
  publicPayload?: string;
}

export function assertAgentActionAllowed(
  action: "open_order" | "seller_proxy" | "settle" | "hcs_audit",
  context: AgentActionContext
): void {
  if (context.budgetInf > context.maxBudgetInf) {
    throw new Error("Budget exceeds delegated policy");
  }

  if (action === "seller_proxy" && !context.escrowFunded) {
    throw new Error("Seller proxy call is blocked until escrow funding is confirmed");
  }

  if (action === "settle" && !context.receiptVerified) {
    throw new Error("Settlement is blocked until a verified receipt exists");
  }

  if (action === "hcs_audit" && context.publicPayload) {
    const lowered = context.publicPayload.toLowerCase();
    if (lowered.includes("rawprompt") || lowered.includes('"prompt"') || lowered.includes('"answer"')) {
      throw new Error("Public audit payload cannot include plaintext prompt or answer fields");
    }
  }
}
