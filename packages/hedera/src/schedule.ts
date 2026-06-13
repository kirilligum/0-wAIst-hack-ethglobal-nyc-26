import {
  AccountId,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  PrivateKey,
  ScheduleCreateTransaction
} from "@hashgraph/sdk";
import { createHederaClient, HederaConfig } from "./config.js";
import { resolveContractId } from "./contracts.js";
import { hashScanTransactionUrl } from "./hcs.js";

export interface ScheduledRefundReadiness {
  ready: boolean;
  requiredFunction: "refundExpired";
  missing: string[];
}

export function scheduledRefundReadiness(env: NodeJS.ProcessEnv = process.env): ScheduledRefundReadiness {
  const hasEscrow = Boolean(env.PROOF_ESCROW_CONTRACT_ID || env.PROOF_ESCROW_ADDRESS);
  const missing = hasEscrow ? [] : ["PROOF_ESCROW_CONTRACT_ID"];
  return {
    ready: missing.length === 0,
    requiredFunction: "refundExpired",
    missing
  };
}

export interface RefundScheduleResult {
  scheduleId: string;
  transactionId: string;
  hashScanUrl: string;
  scheduledFunction: "refundExpired";
  orderId: number;
}

export function buildRefundExpiredTransaction(input: {
  proofEscrowContractIdOrAddress: string;
  orderId: number;
  gas?: number;
}): ContractExecuteTransaction {
  if (!Number.isInteger(input.orderId) || input.orderId <= 0) {
    throw new Error("Scheduled refund orderId must be a positive integer");
  }

  return new ContractExecuteTransaction()
    .setContractId(resolveContractId(input.proofEscrowContractIdOrAddress))
    .setGas(input.gas ?? 250_000)
    .setFunction(
      "refundExpired",
      new ContractFunctionParameters().addUint256(input.orderId)
    );
}

export async function createRefundSchedule(input: {
  config: HederaConfig;
  proofEscrowContractIdOrAddress: string;
  orderId: number;
  waitForExpiry?: boolean;
}): Promise<RefundScheduleResult> {
  const client = createHederaClient(input.config);
  try {
    const operatorKey = PrivateKey.fromString(input.config.operatorKey);
    const response = await new ScheduleCreateTransaction()
      .setScheduledTransaction(buildRefundExpiredTransaction({
        proofEscrowContractIdOrAddress: input.proofEscrowContractIdOrAddress,
        orderId: input.orderId
      }))
      .setPayerAccountId(AccountId.fromString(input.config.operatorId))
      .setAdminKey(operatorKey.publicKey)
      .setWaitForExpiry(input.waitForExpiry ?? true)
      .setScheduleMemo(`0waist.refundExpired.${input.orderId}`)
      .execute(client);
    const receipt = await response.getReceipt(client);
    const scheduleId = receipt.scheduleId?.toString();
    if (!scheduleId) {
      throw new Error("Hedera did not return a refund schedule ID");
    }
    const transactionId = response.transactionId.toString();
    return {
      scheduleId,
      transactionId,
      hashScanUrl: hashScanTransactionUrl(transactionId, input.config.network),
      scheduledFunction: "refundExpired",
      orderId: input.orderId
    };
  } finally {
    client.close();
  }
}
