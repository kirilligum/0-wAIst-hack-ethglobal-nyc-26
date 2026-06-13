export interface BatchSettlementReadiness {
  ready: boolean;
  missing: string[];
  requiredActions: ["ProofEscrow.settle", "HCS.RECEIPT"];
}

export function batchSettlementReadiness(env: NodeJS.ProcessEnv = process.env): BatchSettlementReadiness {
  const missing = ["PROOF_ESCROW_ADDRESS", "HCS_AUDIT_TOPIC_ID"].filter((key) => !env[key]);
  return {
    ready: missing.length === 0,
    missing,
    requiredActions: ["ProofEscrow.settle", "HCS.RECEIPT"]
  };
}
