import { z } from "zod";
import {
  approveInfAllowance,
  INF_DECIMALS,
  infToBaseUnits,
  loadHederaConfig
} from "@0waist/hedera";

export const ApproveInfAllowanceRequestSchema = z.object({
  amountInf: z.number().positive().max(10).default(0.5),
  amountBaseUnits: z.number().int().positive().optional(),
  ownerAccountId: z.string().min(1).optional(),
  confirmedOwner: z.boolean().default(false)
});

export async function approveInfAllowanceForBuyer(
  request: unknown,
  env: NodeJS.ProcessEnv = process.env
) {
  const input = ApproveInfAllowanceRequestSchema.parse(request);
  const proofEscrow = env.PROOF_ESCROW_CONTRACT_ID ?? env.PROOF_ESCROW_ADDRESS;
  const ownerAccountId = input.ownerAccountId ?? env.BUYER_HEDERA_ACCOUNT ?? env.HEDERA_OPERATOR_ID;
  const missing = [
    ...(!proofEscrow ? ["PROOF_ESCROW_CONTRACT_ID"] : []),
    ...(!ownerAccountId ? ["BUYER_HEDERA_ACCOUNT or HEDERA_OPERATOR_ID"] : []),
    ...(!input.confirmedOwner ? ["confirmedOwner"] : [])
  ];

  if (missing.length > 0 || !proofEscrow || !ownerAccountId) {
    return {
      status: "blocked" as const,
      missing,
      message: "INF allowance approval requires a confirmed buyer owner account and deployed ProofEscrow."
    };
  }

  if (ownerAccountId !== env.HEDERA_OPERATOR_ID && !env.BUYER_HEDERA_KEY) {
    return {
      status: "blocked" as const,
      missing: ["BUYER_HEDERA_KEY"],
      message: "Approving INF allowance for a non-operator buyer requires BUYER_HEDERA_KEY."
    };
  }

  const result = await approveInfAllowance({
    config: loadHederaConfig(env),
    spenderContractIdOrAddress: proofEscrow,
    ownerAccountId,
    ownerKey: env.BUYER_HEDERA_KEY,
    amountBaseUnits: input.amountBaseUnits ?? infToBaseUnits(input.amountInf)
  });

  return {
    status: "submitted" as const,
    ...result,
    amountInf: result.amountBaseUnits / 10 ** INF_DECIMALS,
    message: "INF allowance approved for ProofEscrow."
  };
}
