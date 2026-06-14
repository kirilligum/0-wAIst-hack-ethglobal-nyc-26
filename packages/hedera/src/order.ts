import { ContractExecuteTransaction } from "@hashgraph/sdk";
import { Interface } from "ethers";
import { createHederaClient, getMissingHederaEnv, HederaConfig } from "./config.js";
import { resolveContractId } from "./contracts.js";
import { hashScanTransactionUrl } from "./hcs.js";

export interface OpenOrderInput {
  offerId: number;
  promptHash: string;
  requestHash: string;
  deadlineEpochSeconds: number;
}

export interface OpenOrderReadiness {
  ready: boolean;
  missing: string[];
}

export interface OpenOrderResult {
  orderId?: string;
  transactionId: string;
  hashScanUrl: string;
}

const PROOF_ESCROW_OPEN_ORDER_ABI = [
  "function openOrder(uint256 offerId,bytes32 promptHash,bytes32 requestHash,uint64 deadline) returns (uint256 orderId)"
];

const proofEscrowOpenOrderInterface = new Interface(PROOF_ESCROW_OPEN_ORDER_ABI);

function normalizeBytes32(value: string, field: string): string {
  const hex = value.startsWith("0x") ? value : `0x${value}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(`${field} must be a 32-byte hex value`);
  }
  return hex;
}

function assertOpenOrderInput(input: OpenOrderInput): void {
  if (!Number.isInteger(input.offerId) || input.offerId <= 0) {
    throw new Error("offerId must be a positive integer");
  }
  if (!Number.isInteger(input.deadlineEpochSeconds) || input.deadlineEpochSeconds <= 0) {
    throw new Error("deadlineEpochSeconds must be a positive integer");
  }
}

export function openOrderReadiness(env: NodeJS.ProcessEnv = process.env): OpenOrderReadiness {
  const missing = [
    ...getMissingHederaEnv(env),
    ...(env.PROOF_ESCROW_CONTRACT_ID || env.PROOF_ESCROW_ADDRESS ? [] : ["PROOF_ESCROW_CONTRACT_ID"]),
    ...(!env.HTS_INF_TOKEN_ID ? ["HTS_INF_TOKEN_ID"] : [])
  ];
  return {
    ready: missing.length === 0,
    missing
  };
}

export function encodeOpenOrderFunctionData(input: OpenOrderInput): Uint8Array {
  assertOpenOrderInput(input);
  const encoded = proofEscrowOpenOrderInterface.encodeFunctionData("openOrder", [
    input.offerId,
    normalizeBytes32(input.promptHash, "promptHash"),
    normalizeBytes32(input.requestHash, "requestHash"),
    input.deadlineEpochSeconds
  ]);
  return Buffer.from(encoded.slice(2), "hex");
}

export function openOrderCalldataHex(input: OpenOrderInput): string {
  return `0x${Buffer.from(encodeOpenOrderFunctionData(input)).toString("hex")}`;
}

export function buildOpenOrderTransaction(input: {
  proofEscrowContractIdOrAddress: string;
  order: OpenOrderInput;
  gas?: number;
}): ContractExecuteTransaction {
  return new ContractExecuteTransaction()
    .setContractId(resolveContractId(input.proofEscrowContractIdOrAddress))
    .setGas(input.gas ?? 500_000)
    .setFunctionParameters(encodeOpenOrderFunctionData(input.order));
}

export async function submitOpenOrder(input: {
  config: HederaConfig;
  proofEscrowContractIdOrAddress: string;
  order: OpenOrderInput;
}): Promise<OpenOrderResult> {
  const client = createHederaClient(input.config);
  try {
    const response = await buildOpenOrderTransaction({
      proofEscrowContractIdOrAddress: input.proofEscrowContractIdOrAddress,
      order: input.order
    }).execute(client);
    await response.getReceipt(client);

    let orderId: string | undefined;
    try {
      const record = await response.getRecord(client);
      orderId = record.contractFunctionResult?.getUint256(0).toString();
    } catch {
      orderId = undefined;
    }

    const transactionId = response.transactionId.toString();
    return {
      orderId,
      transactionId,
      hashScanUrl: hashScanTransactionUrl(transactionId, input.config.network)
    };
  } finally {
    client.close();
  }
}
