import {
  loadHederaConfig,
  publishProxyOffer,
  proxyRegistryReadiness,
  ProxyRegistryOfferInput
} from "@0waist/hedera";
import {
  Offer,
  SellerRegistrationRequest,
  SellerRegistrationRequestSchema,
  SellerRegistrationResult
} from "@0waist/schemas";
import { upsertRegisteredOffer } from "./offers.js";

function localOfferId(input: SellerRegistrationRequest, registryOfferId?: string): string {
  return registryOfferId ? `registry-${registryOfferId}` : `local-${input.sellerId}-${input.modelId}`;
}

function buildOffer(
  input: SellerRegistrationRequest,
  status: Offer["registryStatus"],
  registry?: {
    registryOfferId?: string;
    transactionId?: string;
    hashScanUrl?: string;
  }
): Offer {
  return {
    offerId: localOfferId(input, registry?.registryOfferId),
    sellerId: input.sellerId,
    sellerEnsName: input.sellerEnsName,
    displayName: input.displayName,
    modelId: input.modelId,
    provider: input.provider,
    inputPricePerMTokInf: input.inputPricePerMTokInf,
    outputPricePerMTokInf: input.outputPricePerMTokInf,
    fixedFeeInf: input.fixedFeeInf,
    maxBudgetInf: input.maxBudgetInf,
    proofMode: "chainlink_cre_zktls",
    active: true,
    x402Endpoint: input.x402Endpoint,
    hederaAccount: input.hederaAccount,
    summary: input.summary,
    registryStatus: status,
    registryOfferId: registry?.registryOfferId,
    registryTransactionId: registry?.transactionId,
    registryHashScanUrl: registry?.hashScanUrl
  };
}

function toRegistryOffer(input: SellerRegistrationRequest, env: NodeJS.ProcessEnv): ProxyRegistryOfferInput {
  const sellerEvmAddress = input.sellerEvmAddress ?? env.SELLER_EVM_ADDRESS ?? env.HEDERA_OPERATOR_EVM_ADDRESS;
  if (!sellerEvmAddress) {
    throw new Error("SELLER_EVM_ADDRESS is required for on-chain seller publication");
  }
  return {
    sellerEvmAddress,
    provider: input.provider,
    modelId: input.modelId,
    endpoint: input.x402Endpoint,
    inputPricePerMTokInf: input.inputPricePerMTokInf,
    outputPricePerMTokInf: input.outputPricePerMTokInf,
    fixedFeeInf: input.fixedFeeInf,
    maxInputTokens: input.maxInputTokens,
    maxOutputTokens: input.maxOutputTokens,
    validUntilEpochSeconds: input.validUntilEpochSeconds,
    hfsManifestFileId: input.hfsManifestFileId ?? env.HFS_MARKET_MANIFEST_FILE_ID
  };
}

export async function registerSellerOffer(
  request: unknown,
  env: NodeJS.ProcessEnv = process.env
): Promise<SellerRegistrationResult> {
  const input = SellerRegistrationRequestSchema.parse(request);

  if (!input.publishOnChain) {
    const offer = buildOffer(input, "local");
    await upsertRegisteredOffer(offer, env);
    return {
      status: "local",
      offer,
      missing: [],
      message: "Seller offer saved locally. It is not visible on Hedera until published."
    };
  }

  const readiness = proxyRegistryReadiness({
    ...env,
    SELLER_EVM_ADDRESS: input.sellerEvmAddress ?? env.SELLER_EVM_ADDRESS ?? env.HEDERA_OPERATOR_EVM_ADDRESS
  });
  if (!readiness.ready) {
    const offer = buildOffer(input, "blocked");
    return {
      status: "blocked",
      offer,
      missing: readiness.missing,
      message: `Seller publication blocked: missing ${readiness.missing.join(", ")}.`
    };
  }

  const proxyRegistry = env.PROXY_REGISTRY_CONTRACT_ID ?? env.PROXY_REGISTRY_ADDRESS;
  if (!proxyRegistry) {
    throw new Error("PROXY_REGISTRY_CONTRACT_ID is required");
  }

  const published = await publishProxyOffer({
    config: loadHederaConfig(env),
    proxyRegistryContractIdOrAddress: proxyRegistry,
    offer: toRegistryOffer(input, env)
  });
  const offer = buildOffer(input, "submitted", published);
  await upsertRegisteredOffer(offer, env);

  return {
    status: "submitted",
    offer,
    missing: [],
    transactionId: published.transactionId,
    hashScanUrl: published.hashScanUrl,
    registryOfferId: published.registryOfferId,
    message: "Seller offer published to ProxyRegistry and saved in the local marketplace cache."
  };
}
