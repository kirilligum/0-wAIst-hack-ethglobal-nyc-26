import { JsonRpcProvider } from "ethers";
import { EnsNameSchema } from "@0waist/schemas";

const DEFAULT_DEMO_SELLER_ENS_NAME = "0waist.eth";
const DEFAULT_SEPOLIA_RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";
const SEPOLIA_CHAIN_ID = 11155111;
const SEPOLIA_ENS_REGISTRY_ADDRESS = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";

export interface EnsResolution {
  status: "resolved" | "registered" | "unresolved" | "blocked";
  name: string;
  network: "sepolia";
  chainId: 11155111;
  displayName?: string;
  address?: string;
  avatarUrl?: string;
  profileUrl: string;
  resolverAddress?: string;
  source: "ethereum-sepolia" | "ens-dev";
  message: string;
}

export function demoSellerEnsName(env: NodeJS.ProcessEnv = process.env): string {
  const parsed = EnsNameSchema.safeParse(
    env.SELLER_ENS_NAME || env.DEMO_SELLER_ENS_NAME || DEFAULT_DEMO_SELLER_ENS_NAME
  );
  return parsed.success ? parsed.data : DEFAULT_DEMO_SELLER_ENS_NAME;
}

export async function resolveEnsName(
  name: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<EnsResolution> {
  const normalized = EnsNameSchema.parse(name);
  const profileUrl = `https://app.ens.dev/p/${normalized}`;
  const provider = new JsonRpcProvider(env.ENS_SEPOLIA_RPC_URL || env.SEPOLIA_RPC_URL || DEFAULT_SEPOLIA_RPC_URL, {
    chainId: SEPOLIA_CHAIN_ID,
    name: "sepolia",
    ensAddress: env.ENS_SEPOLIA_REGISTRY_ADDRESS || SEPOLIA_ENS_REGISTRY_ADDRESS
  });

  try {
    const resolver = await provider.getResolver(normalized);
    const address = await resolver?.getAddress();

    if (!address) {
      const status = normalized === demoSellerEnsName(env) ? "registered" : "unresolved";
      return {
        status,
        name: normalized,
        network: "sepolia",
        chainId: SEPOLIA_CHAIN_ID,
        displayName: normalized,
        profileUrl,
        resolverAddress: resolver?.address,
        source: status === "registered" ? "ens-dev" : "ethereum-sepolia",
        message: status === "registered"
          ? "Sepolia ENS profile is live; no legacy address record is set yet."
          : "Sepolia ENS name exists but no address record was returned."
      };
    }

    let avatarUrl: string | undefined;
    try {
      avatarUrl = await resolver?.getAvatar() ?? undefined;
    } catch {
      avatarUrl = undefined;
    }

    return {
      status: "resolved",
      name: normalized,
      network: "sepolia",
      chainId: SEPOLIA_CHAIN_ID,
      displayName: normalized,
      address,
      avatarUrl,
      profileUrl,
      resolverAddress: resolver?.address,
      source: "ethereum-sepolia",
      message: "ENS resolved live on Sepolia testnet."
    };
  } catch (error) {
    return {
      status: "blocked",
      name: normalized,
      network: "sepolia",
      chainId: SEPOLIA_CHAIN_ID,
      profileUrl,
      source: "ethereum-sepolia",
      message: error instanceof Error ? error.message : "Sepolia ENS lookup failed."
    };
  }
}
