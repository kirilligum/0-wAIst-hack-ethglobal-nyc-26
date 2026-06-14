import {
  FileContentsQuery,
  FileCreateTransaction,
  FileId,
  FileUpdateTransaction,
  PrivateKey
} from "@hashgraph/sdk";
import { Offer } from "@0waist/schemas";
import { createHederaClient, HederaConfig } from "./config.js";
import { hashScanTransactionUrl } from "./hcs.js";

export interface MarketManifest {
  schemaVersion: "0waist.market.v1";
  paymentAsset: "INF";
  network: "hedera-testnet";
  infTokenId?: string;
  auditTopicId?: string;
  mcpEndpoint?: string;
  x402?: {
    network: "hedera-testnet";
    paymentAsset: "INF";
    facilitatorUrl?: string;
  };
  contracts?: {
    proxyRegistry?: string;
    proofEscrow?: string;
    verifierRegistry?: string;
    creReportReceiver?: string;
  };
  chainlinkCre?: {
    workflowId?: string;
    workflowName?: string;
    donId?: string;
    gatewayUrl?: string;
    target?: string;
    chainSelector?: string;
    reportReceiver?: string;
    settlementShell?: string;
    proofPolicyHash?: string;
  };
  sellers: Offer[];
  proofPolicy: {
    mode: "chainlink_cre_zktls";
    publicArtifactPolicy: "hash_only";
    providerPolicyId?: string;
    reclaimProviderId?: string;
  };
  serviceMetadata?: {
    serviceId: "0-waist";
    agentId: "0waist.proofrouter";
    serviceKind: "ai_subscription_proxy_router";
  };
}

export interface ManifestCreationResult {
  fileId: string;
  created?: boolean;
  transactionId: string;
  hashScanUrl: string;
}

export async function createMarketManifest(
  config: HederaConfig,
  manifest: MarketManifest
): Promise<ManifestCreationResult> {
  const client = createHederaClient(config);
  try {
    const key = PrivateKey.fromString(config.operatorKey);
    const response = await new FileCreateTransaction()
      .setKeys([key.publicKey])
      .setContents(JSON.stringify(manifest))
      .execute(client);
    const receipt = await response.getReceipt(client);
    const fileId = receipt.fileId?.toString();
    if (!fileId) {
      throw new Error("Hedera did not return a market manifest file ID");
    }
    const transactionId = response.transactionId.toString();
    return {
      fileId,
      created: true,
      transactionId,
      hashScanUrl: hashScanTransactionUrl(transactionId, config.network)
    };
  } finally {
    client.close();
  }
}

export async function updateMarketManifest(
  config: HederaConfig,
  manifest: MarketManifest,
  fileId = config.marketManifestFileId
): Promise<ManifestCreationResult> {
  if (!fileId) {
    throw new Error("HFS_MARKET_MANIFEST_FILE_ID is required to update the market manifest");
  }

  const client = createHederaClient(config);
  try {
    const response = await new FileUpdateTransaction()
      .setFileId(FileId.fromString(fileId))
      .setContents(JSON.stringify(manifest))
      .execute(client);
    const transactionId = response.transactionId.toString();
    await response.getReceipt(client);
    return {
      fileId,
      created: false,
      transactionId,
      hashScanUrl: hashScanTransactionUrl(transactionId, config.network)
    };
  } finally {
    client.close();
  }
}

export async function createOrUpdateMarketManifest(
  config: HederaConfig,
  manifest: MarketManifest
): Promise<ManifestCreationResult> {
  return config.marketManifestFileId
    ? updateMarketManifest(config, manifest, config.marketManifestFileId)
    : createMarketManifest(config, manifest);
}

export async function readMarketManifest(
  config: HederaConfig,
  fileId = config.marketManifestFileId
): Promise<MarketManifest> {
  if (!fileId) {
    throw new Error("HFS_MARKET_MANIFEST_FILE_ID is required to read the market manifest");
  }

  const client = createHederaClient(config);
  try {
    const contents = await new FileContentsQuery()
      .setFileId(FileId.fromString(fileId))
      .execute(client);
    return JSON.parse(Buffer.from(contents).toString("utf8")) as MarketManifest;
  } finally {
    client.close();
  }
}
