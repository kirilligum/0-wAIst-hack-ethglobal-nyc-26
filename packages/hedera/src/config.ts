import { AccountId, Client, PrivateKey } from "@hashgraph/sdk";

export type HederaNetwork = "testnet";

export interface HederaConfig {
  network: HederaNetwork;
  operatorId: string;
  operatorKey: string;
  auditTopicId?: string;
  marketManifestFileId?: string;
}

export const HEDERA_MINIMAL_ENV = [
  "HEDERA_OPERATOR_ID",
  "HEDERA_OPERATOR_KEY"
] as const;

export function getMissingHederaEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  return HEDERA_MINIMAL_ENV.filter((key) => !env[key]);
}

export function loadHederaConfig(env: NodeJS.ProcessEnv = process.env): HederaConfig {
  const missing = getMissingHederaEnv(env);
  if (missing.length > 0) {
    throw new Error(`Missing Hedera environment: ${missing.join(", ")}`);
  }

  const network = env.HEDERA_NETWORK === "testnet" || !env.HEDERA_NETWORK
    ? "testnet"
    : undefined;
  if (!network) {
    throw new Error("Only HEDERA_NETWORK=testnet is supported for this demo");
  }

  return {
    network,
    operatorId: env.HEDERA_OPERATOR_ID!,
    operatorKey: env.HEDERA_OPERATOR_KEY!,
    auditTopicId: env.HCS_AUDIT_TOPIC_ID,
    marketManifestFileId: env.HFS_MARKET_MANIFEST_FILE_ID
  };
}

export function createHederaClient(config: HederaConfig): Client {
  const client = Client.forTestnet();
  client.setOperator(
    AccountId.fromString(config.operatorId),
    PrivateKey.fromString(config.operatorKey)
  );
  return client;
}
