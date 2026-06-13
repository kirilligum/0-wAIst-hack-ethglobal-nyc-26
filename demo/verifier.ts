import "dotenv/config";
import {
  loadHederaConfig,
  loadOrCreateVerifierSigner,
  setVerifierApproval
} from "@0waist/hedera";
import { updateEnvFile } from "../services/proofrouter-mcp/src/envFile.js";

async function main() {
  const registry = process.env.VERIFIER_REGISTRY_CONTRACT_ID ?? process.env.VERIFIER_REGISTRY_ADDRESS;
  if (!registry) {
    throw new Error("VERIFIER_REGISTRY_CONTRACT_ID is required before approving a verifier");
  }

  const signer = loadOrCreateVerifierSigner(process.env);
  await updateEnvFile({
    VERIFIER_SIGNER_ADDRESS: signer.address,
    VERIFIER_SIGNER_PRIVATE_KEY: signer.privateKey
  });

  const approval = await setVerifierApproval({
    config: loadHederaConfig(process.env),
    verifierRegistryContractIdOrAddress: registry,
    verifierAddress: signer.address,
    approved: true
  });

  console.log(JSON.stringify({
    status: "approved",
    verifier: approval.verifier,
    transactionId: approval.transactionId,
    hashScanUrl: approval.hashScanUrl,
    envUpdated: [
      "VERIFIER_SIGNER_ADDRESS",
      "VERIFIER_SIGNER_PRIVATE_KEY"
    ]
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    status: "fail",
    message: error instanceof Error ? error.message : "Unknown verifier setup failure",
    required: [
      "HEDERA_OPERATOR_ID",
      "HEDERA_OPERATOR_KEY",
      "VERIFIER_REGISTRY_CONTRACT_ID"
    ]
  }, null, 2));
  process.exit(1);
});
