import {
  BatchTransaction,
  ContractExecuteTransaction,
  PrivateKey,
  TopicId,
  TopicMessageSubmitTransaction
} from "@hashgraph/sdk";
import { Interface } from "ethers";
import { AuditMessage } from "@0waist/schemas";
import { createHederaClient, HederaConfig } from "./config.js";
import { resolveContractId } from "./contracts.js";
import { hashScanTransactionUrl, serializeAuditMessage } from "./hcs.js";

export interface BatchSettlementReadiness {
  ready: boolean;
  missing: string[];
  requiredActions: ["ProofEscrow.settle", "HCS.RECEIPT"];
}

export function batchSettlementReadiness(env: NodeJS.ProcessEnv = process.env): BatchSettlementReadiness {
  const missing = [
    ...(env.PROOF_ESCROW_CONTRACT_ID || env.PROOF_ESCROW_ADDRESS ? [] : ["PROOF_ESCROW_CONTRACT_ID"]),
    ...(!env.HCS_AUDIT_TOPIC_ID ? ["HCS_AUDIT_TOPIC_ID"] : [])
  ];
  return {
    ready: missing.length === 0,
    missing,
    requiredActions: ["ProofEscrow.settle", "HCS.RECEIPT"]
  };
}

export interface ContractReceipt {
  orderId: number;
  requestHash: string;
  responseHash: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  verifier: string;
}

export interface SettlementBatchResult {
  transactionId: string;
  hashScanUrl: string;
  innerTransactionIds: string[];
}

const PROOF_ESCROW_SETTLE_ABI = [
  "function settle((uint256 orderId,bytes32 requestHash,bytes32 responseHash,bytes32 modelId,uint256 inputTokens,uint256 outputTokens,address verifier) receipt, bytes verifierSignature)"
];

const proofEscrowInterface = new Interface(PROOF_ESCROW_SETTLE_ABI);

function normalizeBytes32(value: string, field: string): string {
  const hex = value.startsWith("0x") ? value : `0x${value}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(`${field} must be a 32-byte hex value`);
  }
  return hex;
}

function normalizeSignature(value: string): string {
  const hex = value.startsWith("0x") ? value : `0x${value}`;
  if (!/^0x[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) {
    throw new Error("verifierSignature must be hex bytes");
  }
  return hex;
}

export function encodeSettleFunctionData(receipt: ContractReceipt, verifierSignature: string): Uint8Array {
  const encoded = proofEscrowInterface.encodeFunctionData("settle", [
    {
      orderId: receipt.orderId,
      requestHash: normalizeBytes32(receipt.requestHash, "requestHash"),
      responseHash: normalizeBytes32(receipt.responseHash, "responseHash"),
      modelId: normalizeBytes32(receipt.modelId, "modelId"),
      inputTokens: receipt.inputTokens,
      outputTokens: receipt.outputTokens,
      verifier: receipt.verifier
    },
    normalizeSignature(verifierSignature)
  ]);
  return Buffer.from(encoded.slice(2), "hex");
}

export function buildSettleTransaction(input: {
  proofEscrowContractIdOrAddress: string;
  receipt: ContractReceipt;
  verifierSignature: string;
  gas?: number;
}): ContractExecuteTransaction {
  return new ContractExecuteTransaction()
    .setContractId(resolveContractId(input.proofEscrowContractIdOrAddress))
    .setGas(input.gas ?? 650_000)
    .setFunctionParameters(encodeSettleFunctionData(input.receipt, input.verifierSignature));
}

export async function buildSettlementBatch(input: {
  config: HederaConfig;
  proofEscrowContractIdOrAddress: string;
  auditTopicId: string;
  receipt: ContractReceipt;
  verifierSignature: string;
  auditMessage: AuditMessage;
}): Promise<BatchTransaction> {
  if (input.auditMessage.type !== "RECEIPT" && input.auditMessage.type !== "SETTLEMENT") {
    throw new Error("Settlement batch audit message must be RECEIPT or SETTLEMENT");
  }

  const client = createHederaClient(input.config);
  try {
    const batchKey = PrivateKey.fromString(input.config.operatorKey).publicKey;
    const settleTx = await buildSettleTransaction({
      proofEscrowContractIdOrAddress: input.proofEscrowContractIdOrAddress,
      receipt: input.receipt,
      verifierSignature: input.verifierSignature
    }).batchify(client, batchKey);
    const auditTx = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(input.auditTopicId))
      .setMessage(serializeAuditMessage(input.auditMessage))
      .batchify(client, batchKey);

    return new BatchTransaction()
      .addInnerTransaction(settleTx)
      .addInnerTransaction(auditTx);
  } finally {
    client.close();
  }
}

export async function submitSettlementBatch(input: {
  config: HederaConfig;
  proofEscrowContractIdOrAddress: string;
  auditTopicId: string;
  receipt: ContractReceipt;
  verifierSignature: string;
  auditMessage: AuditMessage;
}): Promise<SettlementBatchResult> {
  const client = createHederaClient(input.config);
  try {
    const batch = await buildSettlementBatch(input);
    const response = await batch.execute(client);
    await response.getReceipt(client);
    const transactionId = response.transactionId.toString();
    return {
      transactionId,
      hashScanUrl: hashScanTransactionUrl(transactionId, input.config.network),
      innerTransactionIds: batch.innerTransactionIds
        .map((innerTransactionId) => innerTransactionId?.toString())
        .filter((innerTransactionId): innerTransactionId is string => Boolean(innerTransactionId))
    };
  } finally {
    client.close();
  }
}
