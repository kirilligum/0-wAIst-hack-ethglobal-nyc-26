export interface ContractAddresses {
  proxyRegistry?: string;
  proofEscrow?: string;
  verifierRegistry?: string;
}

export function loadContractAddresses(env: NodeJS.ProcessEnv = process.env): ContractAddresses {
  return {
    proxyRegistry: env.PROXY_REGISTRY_ADDRESS,
    proofEscrow: env.PROOF_ESCROW_ADDRESS,
    verifierRegistry: env.VERIFIER_REGISTRY_ADDRESS
  };
}
