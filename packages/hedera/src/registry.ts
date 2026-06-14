import { ContractExecuteTransaction } from "@hashgraph/sdk";
import { Interface, id } from "ethers";
import { INF_DECIMALS } from "./hts.js";
import { createHederaClient, getMissingHederaEnv, HederaConfig } from "./config.js";
import { resolveContractId } from "./contracts.js";
import { hashScanTransactionUrl } from "./hcs.js";

export interface ProxyRegistryReadiness {
  ready: boolean;
  missing: string[];
}

export interface ProxyRegistryOfferInput {
  sellerEvmAddress: string;
  provider: string;
  modelId: string;
  endpoint: string;
  inputPricePerMTokInf: number;
  outputPricePerMTokInf: number;
  fixedFeeInf: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  validUntilEpochSeconds?: number;
  hfsManifestFileId?: string;
}

export interface ProxyOfferPublishResult {
  registryOfferId?: string;
  transactionId: string;
  hashScanUrl: string;
}

const PROXY_REGISTRY_ABI = [
  "function publishOffer((address seller,bytes32 providerId,bytes32 modelId,bytes32 endpointId,uint256 inputPricePerMTok,uint256 outputPricePerMTok,uint256 fixedFee,uint256 maxInputTokens,uint256 maxOutputTokens,uint64 validUntil,bytes32 hfsManifestFileIdHash,bool active) offer) returns (uint256 offerId)"
];

const proxyRegistryInterface = new Interface(PROXY_REGISTRY_ABI);

export function proxyRegistryReadiness(env: NodeJS.ProcessEnv = process.env): ProxyRegistryReadiness {
  const missing = [
    ...getMissingHederaEnv(env),
    ...(env.PROXY_REGISTRY_CONTRACT_ID || env.PROXY_REGISTRY_ADDRESS ? [] : ["PROXY_REGISTRY_CONTRACT_ID"]),
    ...(env.SELLER_EVM_ADDRESS || env.HEDERA_OPERATOR_EVM_ADDRESS ? [] : ["SELLER_EVM_ADDRESS"])
  ];
  return {
    ready: missing.length === 0,
    missing
  };
}

export function infToBaseUnits(valueInf: number): number {
  if (!Number.isFinite(valueInf) || valueInf < 0) {
    throw new Error("INF value must be a nonnegative finite number");
  }
  const scaled = Math.round(valueInf * 10 ** INF_DECIMALS);
  if (!Number.isSafeInteger(scaled)) {
    throw new Error("INF value is too large to encode safely");
  }
  return scaled;
}

export function textToBytes32(value: string): Uint8Array {
  return Buffer.from(id(value).slice(2), "hex");
}

function requireEvmAddress(value: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new Error("sellerEvmAddress must be a 20-byte EVM address");
  }
  return value;
}

export function encodePublishOfferFunctionData(input: ProxyRegistryOfferInput): Uint8Array {
  const validUntil = input.validUntilEpochSeconds ?? 0;
  if (!Number.isInteger(validUntil) || validUntil < 0) {
    throw new Error("validUntilEpochSeconds must be a nonnegative integer");
  }
  if (!Number.isInteger(input.maxInputTokens) || input.maxInputTokens <= 0) {
    throw new Error("maxInputTokens must be a positive integer");
  }
  if (!Number.isInteger(input.maxOutputTokens) || input.maxOutputTokens <= 0) {
    throw new Error("maxOutputTokens must be a positive integer");
  }

  const encoded = proxyRegistryInterface.encodeFunctionData("publishOffer", [
    {
      seller: requireEvmAddress(input.sellerEvmAddress),
      providerId: textToBytes32(input.provider),
      modelId: textToBytes32(input.modelId),
      endpointId: textToBytes32(input.endpoint),
      inputPricePerMTok: infToBaseUnits(input.inputPricePerMTokInf),
      outputPricePerMTok: infToBaseUnits(input.outputPricePerMTokInf),
      fixedFee: infToBaseUnits(input.fixedFeeInf),
      maxInputTokens: input.maxInputTokens,
      maxOutputTokens: input.maxOutputTokens,
      validUntil,
      hfsManifestFileIdHash: textToBytes32(input.hfsManifestFileId ?? ""),
      active: true
    }
  ]);
  return Buffer.from(encoded.slice(2), "hex");
}

export function buildPublishOfferTransaction(input: {
  proxyRegistryContractIdOrAddress: string;
  offer: ProxyRegistryOfferInput;
  gas?: number;
}): ContractExecuteTransaction {
  return new ContractExecuteTransaction()
    .setContractId(resolveContractId(input.proxyRegistryContractIdOrAddress))
    .setGas(input.gas ?? 350_000)
    .setFunctionParameters(encodePublishOfferFunctionData(input.offer));
}

export async function publishProxyOffer(input: {
  config: HederaConfig;
  proxyRegistryContractIdOrAddress: string;
  offer: ProxyRegistryOfferInput;
}): Promise<ProxyOfferPublishResult> {
  const client = createHederaClient(input.config);
  try {
    const response = await buildPublishOfferTransaction({
      proxyRegistryContractIdOrAddress: input.proxyRegistryContractIdOrAddress,
      offer: input.offer
    }).execute(client);
    await response.getReceipt(client);

    let registryOfferId: string | undefined;
    try {
      const record = await response.getRecord(client);
      registryOfferId = record.contractFunctionResult?.getUint256(0).toString();
    } catch {
      registryOfferId = undefined;
    }

    const transactionId = response.transactionId.toString();
    return {
      registryOfferId,
      transactionId,
      hashScanUrl: hashScanTransactionUrl(transactionId, input.config.network)
    };
  } finally {
    client.close();
  }
}
