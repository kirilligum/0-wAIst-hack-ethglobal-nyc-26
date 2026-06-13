import "dotenv/config";
import { deploy0WaistContracts, createOrLoadInfToken, loadHederaConfig } from "@0waist/hedera";
import { updateEnvFile } from "../services/proofrouter-mcp/src/envFile.js";

function hasContractEnv(): boolean {
  return Boolean(
    process.env.PROXY_REGISTRY_ADDRESS
      && process.env.PROOF_ESCROW_ADDRESS
      && process.env.VERIFIER_REGISTRY_ADDRESS
  );
}

async function main() {
  const config = loadHederaConfig(process.env);
  const inf = await createOrLoadInfToken(config);
  const values: Record<string, string | undefined> = {
    HTS_INF_TOKEN_ID: inf.tokenId,
    HTS_INF_TOKEN_EVM_ADDRESS: inf.evmAddress
  };
  await updateEnvFile(values);

  const contracts = hasContractEnv()
    ? undefined
    : await deploy0WaistContracts({
      config: {
        ...config,
        infTokenId: inf.tokenId
      },
      infTokenEvmAddress: inf.evmAddress
    });

  if (contracts) {
    values.PROXY_REGISTRY_ADDRESS = contracts.proxyRegistry.evmAddress;
    values.PROXY_REGISTRY_CONTRACT_ID = contracts.proxyRegistry.contractId;
    values.PROOF_ESCROW_ADDRESS = contracts.proofEscrow.evmAddress;
    values.PROOF_ESCROW_CONTRACT_ID = contracts.proofEscrow.contractId;
    values.VERIFIER_REGISTRY_ADDRESS = contracts.verifierRegistry.evmAddress;
    values.VERIFIER_REGISTRY_CONTRACT_ID = contracts.verifierRegistry.contractId;
  }

  await updateEnvFile(values);

  console.log(JSON.stringify({
    status: "deployed",
    inf: {
      tokenId: inf.tokenId,
      evmAddress: inf.evmAddress,
      created: inf.created,
      hashScanUrl: inf.hashScanUrl
    },
    contracts: contracts
      ? {
        proxyRegistry: contracts.proxyRegistry,
        proofEscrow: contracts.proofEscrow,
        verifierRegistry: contracts.verifierRegistry
      }
      : "loaded from existing .env values",
    envUpdated: Object.keys(values)
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    status: "fail",
    message: error instanceof Error ? error.message : "Unknown Hedera deployment failure",
    required: [
      "HEDERA_OPERATOR_ID",
      "HEDERA_OPERATOR_KEY"
    ]
  }, null, 2));
  process.exit(1);
});
