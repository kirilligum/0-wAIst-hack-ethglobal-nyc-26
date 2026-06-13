export interface ScheduledRefundReadiness {
  ready: boolean;
  requiredFunction: "refundExpired";
  missing: string[];
}

export function scheduledRefundReadiness(env: NodeJS.ProcessEnv = process.env): ScheduledRefundReadiness {
  const missing = ["PROOF_ESCROW_ADDRESS"].filter((key) => !env[key]);
  return {
    ready: missing.length === 0,
    requiredFunction: "refundExpired",
    missing
  };
}
