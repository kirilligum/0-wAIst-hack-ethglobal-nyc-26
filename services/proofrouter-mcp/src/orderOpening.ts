import { z } from "zod";
import {
  dynamicReadiness,
  loadHederaConfig,
  openOrderCalldataHex,
  openOrderReadiness,
  submitOpenOrder,
  x402Readiness
} from "@0waist/hedera";

export const OpenOrderViaX402InputSchema = z.object({
  offerId: z.coerce.number().int().positive(),
  promptHash: z.string().regex(/^(0x)?[0-9a-fA-F]{64}$/),
  requestHash: z.string().regex(/^(0x)?[0-9a-fA-F]{64}$/),
  deadlineEpochSeconds: z.coerce.number().int().positive().optional(),
  submitOnChain: z.boolean().default(false),
  confirmedBuyerSigner: z.boolean().default(false)
});

export type OpenOrderViaX402Input = z.infer<typeof OpenOrderViaX402InputSchema>;

function defaultDeadlineEpochSeconds(): number {
  return Math.floor(Date.now() / 1000) + 15 * 60;
}

function normalizeBytes32Hex(value: string): string {
  return value.startsWith("0x") ? value : `0x${value}`;
}

function openOrderMissing(env: NodeJS.ProcessEnv): string[] {
  const openOrder = openOrderReadiness(env);
  const dynamic = dynamicReadiness(env);
  const x402 = x402Readiness(env);
  return Array.from(new Set([
    ...openOrder.missing,
    ...dynamic.missing,
    ...x402.missing
  ]));
}

export async function openOrderViaX402(
  request: unknown,
  env: NodeJS.ProcessEnv = process.env
) {
  const input = OpenOrderViaX402InputSchema.parse(request);
  const missing = openOrderMissing(env);
  const proofEscrowContractIdOrAddress = env.PROOF_ESCROW_CONTRACT_ID ?? env.PROOF_ESCROW_ADDRESS;

  if (missing.length > 0 || !proofEscrowContractIdOrAddress) {
    return {
      status: "blocked" as const,
      missing: proofEscrowContractIdOrAddress ? missing : Array.from(new Set([...missing, "PROOF_ESCROW_CONTRACT_ID"])),
      message: "x402 order opening requires Dynamic policy, x402 facilitator, INF token, Hedera operator, and deployed ProofEscrow configuration."
    };
  }

  const order = {
    offerId: input.offerId,
    promptHash: normalizeBytes32Hex(input.promptHash),
    requestHash: normalizeBytes32Hex(input.requestHash),
    deadlineEpochSeconds: input.deadlineEpochSeconds ?? defaultDeadlineEpochSeconds()
  };
  const preparedTransaction = {
    proofEscrowContractIdOrAddress,
    functionName: "openOrder",
    gas: 500_000,
    functionParametersHex: openOrderCalldataHex(order),
    order,
    x402: {
      facilitatorUrl: env.X402_FACILITATOR_URL,
      network: env.X402_NETWORK ?? "hedera-testnet",
      paymentAsset: "INF"
    }
  };

  if (!input.submitOnChain) {
    return {
      status: "prepared" as const,
      missing: [],
      preparedTransaction,
      message: "Prepared ProofEscrow.openOrder calldata. The buyer wallet must submit it through the Dynamic/x402 INF funding path."
    };
  }

  if (!input.confirmedBuyerSigner) {
    return {
      status: "blocked" as const,
      missing: ["confirmedBuyerSigner"],
      preparedTransaction,
      message: "Live submission requires the configured Hedera signer to be the buyer wallet with INF allowance granted to ProofEscrow."
    };
  }

  const submitted = await submitOpenOrder({
    config: loadHederaConfig(env),
    proofEscrowContractIdOrAddress,
    order
  });

  return {
    status: "submitted" as const,
    missing: [],
    preparedTransaction,
    transactionId: submitted.transactionId,
    hashScanUrl: submitted.hashScanUrl,
    orderId: submitted.orderId,
    escrowEvidence: submitted.orderId
      ? {
        orderId: submitted.orderId,
        offerId: order.offerId,
        requestHash: order.requestHash,
        proofEscrowContractIdOrAddress,
        network: env.X402_NETWORK ?? "hedera-testnet",
        paymentAsset: "INF",
        transactionId: submitted.transactionId,
        hashScanUrl: submitted.hashScanUrl
      }
      : undefined,
    message: submitted.orderId
      ? "ProofEscrow order opened and escrow evidence is ready for the seller proxy."
      : "ProofEscrow transaction submitted; read the contract record or event log for the order id before calling the seller proxy."
  };
}
