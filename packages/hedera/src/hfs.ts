import {
  FileContentsQuery,
  FileCreateTransaction,
  FileId,
  PrivateKey
} from "@hashgraph/sdk";
import { Offer } from "@0waist/schemas";
import { createHederaClient, HederaConfig } from "./config.js";
import { hashScanTransactionUrl } from "./hcs.js";

export interface MarketManifest {
  schemaVersion: "0waist.market.v1";
  paymentAsset: "INF";
  network: "hedera-testnet";
  auditTopicId?: string;
  sellers: Offer[];
  proofPolicy: {
    mode: "direct_zktls_api";
    publicArtifactPolicy: "hash_only";
  };
}

export interface ManifestCreationResult {
  fileId: string;
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
      transactionId,
      hashScanUrl: hashScanTransactionUrl(transactionId, config.network)
    };
  } finally {
    client.close();
  }
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
