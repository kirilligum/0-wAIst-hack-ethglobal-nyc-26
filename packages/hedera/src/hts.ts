import {
  AccountId,
  PrivateKey,
  TokenAssociateTransaction,
  TokenCreateTransaction,
  TokenId,
  TokenSupplyType,
  TokenType,
  TransferTransaction
} from "@hashgraph/sdk";
import { createHederaClient, HederaConfig } from "./config.js";
import { hashScanTransactionUrl } from "./hcs.js";

export const INF_ASSET = "INF";
export const INF_TOKEN_NAME = "0-wAIst Inference Credit";
export const INF_DECIMALS = 8;
export const INF_INITIAL_SUPPLY_BASE_UNITS = 100_000_000_000;

export interface InfTokenResult {
  tokenId: string;
  evmAddress: string;
  created: boolean;
  transactionId?: string;
  hashScanUrl?: string;
}

export interface HederaTransferResult {
  transactionId: string;
  hashScanUrl: string;
}

export function assertProductAssetInf(asset: string): void {
  if (asset !== INF_ASSET) {
    throw new Error("Product settlement asset must be INF");
  }
}

export function tokenIdToEvmAddress(tokenId: string): string {
  return `0x${TokenId.fromString(tokenId).toSolidityAddress()}`;
}

export async function createOrLoadInfToken(config: HederaConfig): Promise<InfTokenResult> {
  if (config.infTokenId) {
    return {
      tokenId: config.infTokenId,
      evmAddress: tokenIdToEvmAddress(config.infTokenId),
      created: false
    };
  }

  const client = createHederaClient(config);
  try {
    const operatorId = AccountId.fromString(config.operatorId);
    const operatorPublicKey = PrivateKey.fromString(config.operatorKey).publicKey;
    const response = await new TokenCreateTransaction()
      .setTokenName(INF_TOKEN_NAME)
      .setTokenSymbol(INF_ASSET)
      .setDecimals(INF_DECIMALS)
      .setInitialSupply(INF_INITIAL_SUPPLY_BASE_UNITS)
      .setTreasuryAccountId(operatorId)
      .setAdminKey(operatorPublicKey)
      .setSupplyKey(operatorPublicKey)
      .setTokenType(TokenType.FungibleCommon)
      .setSupplyType(TokenSupplyType.Infinite)
      .setTokenMemo("0waist.inf")
      .execute(client);
    const receipt = await response.getReceipt(client);
    const tokenId = receipt.tokenId?.toString();
    if (!tokenId) {
      throw new Error("Hedera did not return an INF token ID");
    }
    const transactionId = response.transactionId.toString();
    return {
      tokenId,
      evmAddress: tokenIdToEvmAddress(tokenId),
      created: true,
      transactionId,
      hashScanUrl: hashScanTransactionUrl(transactionId, config.network)
    };
  } finally {
    client.close();
  }
}

export async function associateInfToken(
  config: HederaConfig,
  accountId: string,
  tokenId = config.infTokenId
): Promise<HederaTransferResult> {
  if (!tokenId) {
    throw new Error("HTS_INF_TOKEN_ID is required to associate INF");
  }

  const client = createHederaClient(config);
  try {
    const response = await new TokenAssociateTransaction()
      .setAccountId(AccountId.fromString(accountId))
      .setTokenIds([TokenId.fromString(tokenId)])
      .execute(client);
    const transactionId = response.transactionId.toString();
    await response.getReceipt(client);
    return {
      transactionId,
      hashScanUrl: hashScanTransactionUrl(transactionId, config.network)
    };
  } finally {
    client.close();
  }
}

export async function transferInf(
  config: HederaConfig,
  toAccountId: string,
  amountBaseUnits: number,
  tokenId = config.infTokenId
): Promise<HederaTransferResult> {
  if (!tokenId) {
    throw new Error("HTS_INF_TOKEN_ID is required to transfer INF");
  }
  if (!Number.isInteger(amountBaseUnits) || amountBaseUnits <= 0) {
    throw new Error("INF transfer amount must be a positive integer in base units");
  }

  const client = createHederaClient(config);
  try {
    const response = await new TransferTransaction()
      .addTokenTransfer(TokenId.fromString(tokenId), AccountId.fromString(config.operatorId), -amountBaseUnits)
      .addTokenTransfer(TokenId.fromString(tokenId), AccountId.fromString(toAccountId), amountBaseUnits)
      .execute(client);
    const transactionId = response.transactionId.toString();
    await response.getReceipt(client);
    return {
      transactionId,
      hashScanUrl: hashScanTransactionUrl(transactionId, config.network)
    };
  } finally {
    client.close();
  }
}
