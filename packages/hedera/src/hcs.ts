import {
  TopicCreateTransaction,
  TopicId,
  TopicMessageSubmitTransaction
} from "@hashgraph/sdk";
import { AuditMessage, AuditMessageSchema } from "@0waist/schemas";
import { createHederaClient, HederaConfig } from "./config.js";

export interface TopicCreationResult {
  topicId: string;
  created?: boolean;
  transactionId: string;
  hashScanUrl: string;
}

export interface AuditSubmitResult {
  topicId: string;
  transactionId: string;
  sequenceNumber?: string;
  hashScanUrl: string;
}

export function hashScanTransactionUrl(transactionId: string, network = "testnet"): string {
  return `https://hashscan.io/${network}/transaction/${encodeURIComponent(transactionId)}`;
}

export function hashScanTopicUrl(topicId: string, network = "testnet"): string {
  return `https://hashscan.io/${network}/topic/${encodeURIComponent(topicId)}`;
}

export function serializeAuditMessage(message: AuditMessage): string {
  const parsed = AuditMessageSchema.parse(message);
  const payload = JSON.stringify(parsed);
  assertNoPublicPlaintext(payload);
  return payload;
}

export function assertNoPublicPlaintext(payload: string): void {
  const bannedKeys = ["prompt", "rawPrompt", "response", "answer", "apiKey"];
  for (const key of bannedKeys) {
    if (payload.includes(`"${key}"`)) {
      throw new Error(`Public audit payload contains disallowed field: ${key}`);
    }
  }
}

export async function createAuditTopic(config: HederaConfig): Promise<TopicCreationResult> {
  const client = createHederaClient(config);
  try {
    const response = await new TopicCreateTransaction()
      .setTopicMemo("0waist.audit")
      .execute(client);
    const receipt = await response.getReceipt(client);
    const topicId = receipt.topicId?.toString();
    if (!topicId) {
      throw new Error("Hedera did not return an audit topic ID");
    }
    const transactionId = response.transactionId.toString();
    return {
      topicId,
      created: true,
      transactionId,
      hashScanUrl: hashScanTransactionUrl(transactionId, config.network)
    };
  } finally {
    client.close();
  }
}

export async function createOrLoadAuditTopic(config: HederaConfig): Promise<TopicCreationResult> {
  if (config.auditTopicId) {
    return {
      topicId: config.auditTopicId,
      created: false,
      transactionId: "",
      hashScanUrl: hashScanTopicUrl(config.auditTopicId, config.network)
    };
  }

  return createAuditTopic(config);
}

export async function submitAuditMessage(
  config: HederaConfig,
  message: AuditMessage
): Promise<AuditSubmitResult> {
  if (!config.auditTopicId) {
    throw new Error("HCS_AUDIT_TOPIC_ID is required before submitting audit messages");
  }

  const client = createHederaClient(config);
  const payload = serializeAuditMessage(message);
  try {
    const response = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(config.auditTopicId))
      .setMessage(payload)
      .execute(client);
    const receipt = await response.getReceipt(client);
    const transactionId = response.transactionId.toString();

    return {
      topicId: config.auditTopicId,
      transactionId,
      sequenceNumber: receipt.topicSequenceNumber?.toString(),
      hashScanUrl: hashScanTransactionUrl(transactionId, config.network)
    };
  } finally {
    client.close();
  }
}
