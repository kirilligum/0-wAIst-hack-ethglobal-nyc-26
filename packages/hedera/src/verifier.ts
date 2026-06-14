import {
  ContractExecuteTransaction,
  ContractFunctionParameters
} from "@hashgraph/sdk";
import { AbiCoder, getBytes, isHexString, keccak256, verifyMessage, Wallet } from "ethers";
import { ContractReceipt } from "./batch.js";
import { createHederaClient, HederaConfig } from "./config.js";
import { contractIdToEvmAddress, resolveContractId } from "./contracts.js";
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

export interface LocalVerifierReceiptSignature {
  receipt: ContractReceipt;
  receiptHash: string;
  verifierSignature: string;
  recoveredVerifier: string;
  verificationMode: "local-verifier-placeholder";
}

const receiptAbiCoder = AbiCoder.defaultAbiCoder();

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

function normalizeBytes32(value: string, field: string): string {
  const hex = value.startsWith("0x") ? value : `0x${value}`;
  if (!isHexString(hex, 32)) {
    throw new Error(`${field} must be a 32-byte hex value`);
  }
  return hex;
}

function normalizeEvmAddress(value: string): string {
  if (value.startsWith("0x")) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
      throw new Error("EVM address must be a 20-byte hex address");
    }
    return value;
  }
  return contractIdToEvmAddress(value);
}

export function localVerifierReceiptHash(input: {
  chainId: number | bigint;
  proofEscrowContractIdOrAddress: string;
  receipt: ContractReceipt;
}): string {
  const proofEscrowAddress = normalizeEvmAddress(input.proofEscrowContractIdOrAddress);
  const verifierAddress = normalizeEvmAddress(input.receipt.verifier);
  const encoded = receiptAbiCoder.encode(
    ["uint256", "address", "uint256", "bytes32", "bytes32", "bytes32", "uint256", "uint256", "address"],
    [
      input.chainId,
      proofEscrowAddress,
      input.receipt.orderId,
      normalizeBytes32(input.receipt.requestHash, "requestHash"),
      normalizeBytes32(input.receipt.responseHash, "responseHash"),
      normalizeBytes32(input.receipt.modelId, "modelId"),
      input.receipt.inputTokens,
      input.receipt.outputTokens,
      verifierAddress
    ]
  );
  return keccak256(encoded);
}

export async function signLocalVerifierReceipt(input: {
  chainId?: number | bigint;
  network?: "testnet";
  proofEscrowContractIdOrAddress: string;
  receipt: Omit<ContractReceipt, "verifier"> & { verifier?: string };
  verifierPrivateKey: string;
}): Promise<LocalVerifierReceiptSignature> {
  const wallet = new Wallet(input.verifierPrivateKey);
  const receipt: ContractReceipt = {
    ...input.receipt,
    verifier: input.receipt.verifier ?? wallet.address
  };
  const chainId = input.chainId ?? (input.network === "testnet" || !input.network ? 296 : 296);
  const receiptHash = localVerifierReceiptHash({
    chainId,
    proofEscrowContractIdOrAddress: input.proofEscrowContractIdOrAddress,
    receipt
  });
  const verifierSignature = await wallet.signMessage(getBytes(receiptHash));
  return {
    receipt,
    receiptHash,
    verifierSignature,
    recoveredVerifier: verifyMessage(getBytes(receiptHash), verifierSignature),
    verificationMode: "local-verifier-placeholder"
  };
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
