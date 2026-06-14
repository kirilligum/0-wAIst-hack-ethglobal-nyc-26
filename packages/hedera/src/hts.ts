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

export interface InfAccountTokenStatus {
  status: "ok" | "unavailable";
  accountId: string;
  tokenId: string;
  associated: boolean;
  balanceBaseUnits: number;
  decimals: number;
  balanceInf: number;
  missing: string[];
  message?: string;
}

export interface InfAllowanceStatus {
  status: "ok" | "unavailable";
  ownerAccountId: string;
  spenderAccountId: string;
  tokenId: string;
  amountBaseUnits: number;
  amountInf: number;
  sufficientForBaseUnits?: boolean;
  missing: string[];
  message?: string;
}

export interface InfWalletDiagnostics {
  status: "ready" | "blocked";
  tokenId?: string;
  buyer?: InfAccountTokenStatus;
  seller?: InfAccountTokenStatus;
  proofEscrowAllowance?: InfAllowanceStatus;
  missing: string[];
}

interface MirrorTokenRelationshipResponse {
  tokens?: Array<{
    token_id?: string;
    balance?: number;
    decimals?: number;
  }>;
}

interface MirrorTokenAllowanceResponse {
  allowances?: Array<{
    amount?: number;
    owner?: string;
    spender?: string;
    token_id?: string;
  }>;
}

export function assertProductAssetInf(asset: string): void {
  if (asset !== INF_ASSET) {
    throw new Error("Product settlement asset must be INF");
  }
}

export function tokenIdToEvmAddress(tokenId: string): string {
  return `0x${TokenId.fromString(tokenId).toSolidityAddress()}`;
}

function mirrorBaseUrl(network = "testnet"): string {
  return `https://${network}.mirrornode.hedera.com/api/v1`;
}

function toInf(balanceBaseUnits: number, decimals: number): number {
  return balanceBaseUnits / 10 ** decimals;
}

export async function getInfAccountTokenStatus(input: {
  accountId: string;
  tokenId: string;
  network?: string;
  fetchImpl?: typeof fetch;
}): Promise<InfAccountTokenStatus> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const url = `${mirrorBaseUrl(input.network)}/accounts/${encodeURIComponent(input.accountId)}/tokens?token.id=${encodeURIComponent(input.tokenId)}`;
  const response = await fetchImpl(url);
  if (!response.ok) {
    return {
      status: "unavailable",
      accountId: input.accountId,
      tokenId: input.tokenId,
      associated: false,
      balanceBaseUnits: 0,
      decimals: INF_DECIMALS,
      balanceInf: 0,
      missing: ["mirrorNodeAccountTokens"],
      message: `Mirror Node token relationship lookup failed with HTTP ${response.status}.`
    };
  }

  const body = await response.json() as MirrorTokenRelationshipResponse;
  const relationship = (body.tokens ?? []).find((token) => token.token_id === input.tokenId);
  const balanceBaseUnits = relationship?.balance ?? 0;
  const decimals = relationship?.decimals ?? INF_DECIMALS;

  return {
    status: "ok",
    accountId: input.accountId,
    tokenId: input.tokenId,
    associated: Boolean(relationship),
    balanceBaseUnits,
    decimals,
    balanceInf: toInf(balanceBaseUnits, decimals),
    missing: relationship ? [] : ["INF association"]
  };
}

export async function getInfSpenderAllowance(input: {
  ownerAccountId: string;
  spenderAccountId: string;
  tokenId: string;
  network?: string;
  requiredBaseUnits?: number;
  fetchImpl?: typeof fetch;
}): Promise<InfAllowanceStatus> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const url = `${mirrorBaseUrl(input.network)}/accounts/${encodeURIComponent(input.ownerAccountId)}/allowances/tokens?spender.id=${encodeURIComponent(input.spenderAccountId)}&token.id=${encodeURIComponent(input.tokenId)}`;
  const response = await fetchImpl(url);
  if (!response.ok) {
    return {
      status: "unavailable",
      ownerAccountId: input.ownerAccountId,
      spenderAccountId: input.spenderAccountId,
      tokenId: input.tokenId,
      amountBaseUnits: 0,
      amountInf: 0,
      sufficientForBaseUnits: input.requiredBaseUnits === undefined ? undefined : false,
      missing: ["mirrorNodeTokenAllowances"],
      message: `Mirror Node token allowance lookup failed with HTTP ${response.status}.`
    };
  }

  const body = await response.json() as MirrorTokenAllowanceResponse;
  const allowance = (body.allowances ?? []).find((candidate) => (
    candidate.owner === input.ownerAccountId
      && candidate.spender === input.spenderAccountId
      && candidate.token_id === input.tokenId
  ));
  const amountBaseUnits = allowance?.amount ?? 0;
  const sufficientForBaseUnits = input.requiredBaseUnits === undefined
    ? undefined
    : amountBaseUnits >= input.requiredBaseUnits;

  return {
    status: "ok",
    ownerAccountId: input.ownerAccountId,
    spenderAccountId: input.spenderAccountId,
    tokenId: input.tokenId,
    amountBaseUnits,
    amountInf: toInf(amountBaseUnits, INF_DECIMALS),
    sufficientForBaseUnits,
    missing: amountBaseUnits > 0 ? [] : ["ProofEscrow INF allowance"]
  };
}

export async function getInfWalletDiagnostics(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch
): Promise<InfWalletDiagnostics> {
  const tokenId = env.HTS_INF_TOKEN_ID;
  const buyerAccountId = env.BUYER_HEDERA_ACCOUNT ?? env.HEDERA_OPERATOR_ID;
  const sellerAccountId = env.SELLER_HEDERA_ACCOUNT;
  const proofEscrowAccountId = env.PROOF_ESCROW_CONTRACT_ID;
  const missing = [
    ...(!tokenId ? ["HTS_INF_TOKEN_ID"] : []),
    ...(!buyerAccountId ? ["BUYER_HEDERA_ACCOUNT or HEDERA_OPERATOR_ID"] : []),
    ...(!sellerAccountId ? ["SELLER_HEDERA_ACCOUNT"] : []),
    ...(!proofEscrowAccountId ? ["PROOF_ESCROW_CONTRACT_ID"] : [])
  ];

  if (!tokenId || !buyerAccountId) {
    return {
      status: "blocked",
      tokenId,
      missing
    };
  }

  const [buyer, seller, proofEscrowAllowance] = await Promise.all([
    getInfAccountTokenStatus({
      accountId: buyerAccountId,
      tokenId,
      network: env.HEDERA_NETWORK ?? "testnet",
      fetchImpl
    }),
    sellerAccountId
      ? getInfAccountTokenStatus({
        accountId: sellerAccountId,
        tokenId,
        network: env.HEDERA_NETWORK ?? "testnet",
        fetchImpl
      })
      : Promise.resolve(undefined),
    proofEscrowAccountId
      ? getInfSpenderAllowance({
        ownerAccountId: buyerAccountId,
        spenderAccountId: proofEscrowAccountId,
        tokenId,
        network: env.HEDERA_NETWORK ?? "testnet",
        fetchImpl
      })
      : Promise.resolve(undefined)
  ]);
  const readinessMissing = [
    ...missing,
    ...buyer.missing.map((item) => `buyer ${item}`),
    ...(seller?.missing.map((item) => `seller ${item}`) ?? []),
    ...(proofEscrowAllowance?.missing ?? [])
  ];

  return {
    status: readinessMissing.length === 0 ? "ready" : "blocked",
    tokenId,
    buyer,
    seller,
    proofEscrowAllowance,
    missing: readinessMissing
  };
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
