import {
  ContractExecuteTransaction,
  ContractFunctionParameters
} from "@hashgraph/sdk";
import { Wallet } from "ethers";
import { createHederaClient, HederaConfig } from "./config.js";
import { resolveContractId } from "./contracts.js";
import { hashScanTransactionUrl } from "./hcs.js";

export interface VerifierSigner {
  address: string;
  privateKey: string;
}

export interface VerifierApprovalResult {
  verifier: string;
  approved: boolean;
  transactionId: string;
  hashScanUrl: string;
}

export function createVerifierSigner(): VerifierSigner {
  const wallet = Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey
  };
}

export function loadOrCreateVerifierSigner(env: NodeJS.ProcessEnv = process.env): VerifierSigner {
  if (env.VERIFIER_SIGNER_PRIVATE_KEY) {
    const wallet = new Wallet(env.VERIFIER_SIGNER_PRIVATE_KEY);
    return {
      address: env.VERIFIER_SIGNER_ADDRESS ?? wallet.address,
      privateKey: wallet.privateKey
    };
  }

  return createVerifierSigner();
}

export async function setVerifierApproval(input: {
  config: HederaConfig;
  verifierRegistryContractIdOrAddress: string;
  verifierAddress: string;
  approved: boolean;
}): Promise<VerifierApprovalResult> {
  const client = createHederaClient(input.config);
  try {
    const response = await new ContractExecuteTransaction()
      .setContractId(resolveContractId(input.verifierRegistryContractIdOrAddress))
      .setGas(150_000)
      .setFunction(
        "setVerifier",
        new ContractFunctionParameters()
          .addAddress(input.verifierAddress)
          .addBool(input.approved)
      )
      .execute(client);
    await response.getReceipt(client);
    const transactionId = response.transactionId.toString();
    return {
      verifier: input.verifierAddress,
      approved: input.approved,
      transactionId,
      hashScanUrl: hashScanTransactionUrl(transactionId, input.config.network)
    };
  } finally {
    client.close();
  }
}
