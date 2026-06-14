import { z } from "zod";
import {
  createRefundSchedule,
  loadHederaConfig
} from "@0waist/hedera";

export const RefundScheduleRequestSchema = z.object({
  orderId: z.number().int().positive(),
  confirmedFundedOrder: z.boolean().default(false)
});

export async function createRefundScheduleForOrder(
  request: unknown,
  env: NodeJS.ProcessEnv = process.env
) {
  const input = RefundScheduleRequestSchema.parse(request);
  const proofEscrow = env.PROOF_ESCROW_CONTRACT_ID ?? env.PROOF_ESCROW_ADDRESS;
  const missing = [
    ...(!input.confirmedFundedOrder ? ["confirmedFundedOrder"] : []),
    ...(!proofEscrow ? ["PROOF_ESCROW_CONTRACT_ID"] : [])
  ];

  if (missing.length > 0 || !proofEscrow) {
    return {
      status: "blocked" as const,
      missing,
      message: "Refund scheduling requires a real funded ProofEscrow order."
    };
  }

  return {
    status: "submitted" as const,
    schedule: await createRefundSchedule({
      config: loadHederaConfig(env),
      proofEscrowContractIdOrAddress: proofEscrow,
      orderId: input.orderId
    }),
    message: "Scheduled refund transaction created for ProofEscrow.refundExpired(orderId)."
  };
}
