import { readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import {
  ContractCreateFlow,
  ContractFunctionParameters,
  ContractId
} from "@hashgraph/sdk";
import solc from "solc";
import { createHederaClient, HederaConfig } from "./config.js";
import { hashScanTransactionUrl } from "./hcs.js";

export interface ContractAddresses {
  proxyRegistry?: string;
  proofEscrow?: string;
  verifierRegistry?: string;
}

export type ContractName = "ProxyRegistry" | "VerifierRegistry" | "ProofEscrow";

export interface CompiledContract {
  contractName: ContractName;
  abi: unknown[];
  bytecode: string;
}

export interface ContractDeploymentResult {
  contractName: ContractName;
  contractId: string;
  evmAddress: string;
  transactionId: string;
  hashScanUrl: string;
}

export interface FullContractDeploymentResult {
  proxyRegistry: ContractDeploymentResult;
  proofEscrow: ContractDeploymentResult;
  verifierRegistry: ContractDeploymentResult;
}

interface SolcOutput {
  contracts?: Record<string, Record<string, {
    abi: unknown[];
    evm?: {
      bytecode?: {
        object?: string;
      };
    };
  }>>;
  errors?: Array<{
    severity: "error" | "warning" | string;
    formattedMessage?: string;
    message: string;
  }>;
}

export function loadContractAddresses(env: NodeJS.ProcessEnv = process.env): ContractAddresses {
  return {
    proxyRegistry: env.PROXY_REGISTRY_ADDRESS,
    proofEscrow: env.PROOF_ESCROW_ADDRESS,
    verifierRegistry: env.VERIFIER_REGISTRY_ADDRESS
  };
}

export function contractIdToEvmAddress(contractId: string): string {
  return `0x${ContractId.fromString(contractId).toSolidityAddress()}`;
}

export async function compileSolidityContracts(
  sourceDir = resolve(process.cwd(), "contracts/src")
): Promise<Record<ContractName, CompiledContract>> {
  const fileNames = ["ProxyRegistry.sol", "VerifierRegistry.sol", "ProofEscrow.sol"] as const;
  const sources = Object.fromEntries(await Promise.all(fileNames.map(async (fileName) => {
    const path = join(sourceDir, fileName);
    return [
      basename(path),
      {
        content: await readFile(path, "utf8")
      }
    ];
  })));

  const input = {
    language: "Solidity",
    sources,
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"]
        }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input))) as SolcOutput;
  const errors = output.errors?.filter((error) => error.severity === "error") ?? [];
  if (errors.length > 0) {
    throw new Error(errors.map((error) => error.formattedMessage ?? error.message).join("\n"));
  }

  const result = {} as Record<ContractName, CompiledContract>;
  for (const contractName of ["ProxyRegistry", "VerifierRegistry", "ProofEscrow"] as const) {
    const compiled = Object.values(output.contracts ?? {})
      .map((contracts) => contracts[contractName])
      .find(Boolean);
    const bytecode = compiled?.evm?.bytecode?.object;
    if (!compiled || !bytecode) {
      throw new Error(`Solidity output did not include bytecode for ${contractName}`);
    }
    result[contractName] = {
      contractName,
      abi: compiled.abi,
      bytecode
    };
  }

  return result;
}

export async function deployContract(input: {
  config: HederaConfig;
  compiled: CompiledContract;
  constructorParameters?: ContractFunctionParameters;
  gas?: number;
}): Promise<ContractDeploymentResult> {
  const client = createHederaClient(input.config);
  try {
    const response = await new ContractCreateFlow()
      .setBytecode(input.compiled.bytecode)
      .setGas(input.gas ?? 5_000_000)
      .setConstructorParameters(input.constructorParameters ?? new ContractFunctionParameters())
      .setContractMemo(`0waist.${input.compiled.contractName}`)
      .execute(client);
    const receipt = await response.getReceipt(client);
    const contractId = receipt.contractId?.toString();
    if (!contractId) {
      throw new Error(`Hedera did not return a contract ID for ${input.compiled.contractName}`);
    }
    const transactionId = response.transactionId.toString();
    return {
      contractName: input.compiled.contractName,
      contractId,
      evmAddress: contractIdToEvmAddress(contractId),
      transactionId,
      hashScanUrl: hashScanTransactionUrl(transactionId, input.config.network)
    };
  } finally {
    client.close();
  }
}

export async function deploy0WaistContracts(input: {
  config: HederaConfig;
  infTokenEvmAddress: string;
  sourceDir?: string;
}): Promise<FullContractDeploymentResult> {
  const compiled = await compileSolidityContracts(input.sourceDir);
  const verifierRegistry = await deployContract({
    config: input.config,
    compiled: compiled.VerifierRegistry
  });
  const proxyRegistry = await deployContract({
    config: input.config,
    compiled: compiled.ProxyRegistry
  });
  const proofEscrow = await deployContract({
    config: input.config,
    compiled: compiled.ProofEscrow,
    constructorParameters: new ContractFunctionParameters()
      .addAddress(input.infTokenEvmAddress)
      .addAddress(verifierRegistry.evmAddress)
      .addAddress(proxyRegistry.evmAddress),
    gas: 6_000_000
  });

  return {
    proxyRegistry,
    proofEscrow,
    verifierRegistry
  };
}
