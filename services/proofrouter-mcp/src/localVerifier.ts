import { z } from "zod";
import {
  loadOrCreateVerifierSigner,
  signLocalVerifierReceipt,
  textToBytes32
} from "@0waist/hedera";

export const LocalVerifierReceiptRequestSchema = z.object({
  orderId: z.number().int().positive(),
  requestHash: z.string().min(64),
  responseHash: z.string().min(64),
  modelId: z.string().min(1),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  proofEscrowContractIdOrAddress: z.string().min(1).optional(),
  chainId: z.number().int().positive().optional()
});
export type LocalVerifierReceiptRequest = z.infer<typeof LocalVerifierReceiptRequestSchema>;

function bytes32Hex(value: string): string {
  const hex = value.startsWith("0x") ? value.slice(2) : value;
  if (/^[0-9a-fA-F]{64}$/.test(hex)) {
    return hex;
  }
  return Buffer.from(textToBytes32(value)).toString("hex");
}

export async function createLocalVerifierReceipt(
  input: LocalVerifierReceiptRequest,
  env: NodeJS.ProcessEnv = process.env
) {
  const parsed = LocalVerifierReceiptRequestSchema.parse(input);
  const proofEscrow = parsed.proofEscrowContractIdOrAddress
    ?? env.PROOF_ESCROW_CONTRACT_ID
    ?? env.PROOF_ESCROW_ADDRESS;
  const missing = [
    ...(!proofEscrow ? ["PROOF_ESCROW_CONTRACT_ID"] : []),
    ...(!env.VERIFIER_SIGNER_PRIVATE_KEY ? ["VERIFIER_SIGNER_PRIVATE_KEY"] : []),
    ...(!(env.VERIFIER_REGISTRY_CONTRACT_ID || env.VERIFIER_REGISTRY_ADDRESS) ? ["VERIFIER_REGISTRY_CONTRACT_ID"] : [])
  ];

  if (missing.length > 0 || !proofEscrow || !env.VERIFIER_SIGNER_PRIVATE_KEY) {
    return {
      status: "blocked" as const,
      verificationMode: "local-verifier-placeholder" as const,
      missing,
      message: "Local verifier placeholder requires deployed ProofEscrow and approved verifier signer configuration."
    };
  }

  const signer = loadOrCreateVerifierSigner(env);
  const signed = await signLocalVerifierReceipt({
    chainId: parsed.chainId,
    network: "testnet",
    proofEscrowContractIdOrAddress: proofEscrow,
    receipt: {
      orderId: parsed.orderId,
      requestHash: parsed.requestHash,
      responseHash: parsed.responseHash,
      modelId: bytes32Hex(parsed.modelId),
      inputTokens: parsed.inputTokens,
      outputTokens: parsed.outputTokens,
      verifier: signer.address
    },
    verifierPrivateKey: signer.privateKey
  });

  return {
    status: "signed" as const,
    ...signed,
    message: "Local verifier placeholder signed a ProofEscrow-compatible receipt while Chainlink CRE is unavailable."
  };
}
