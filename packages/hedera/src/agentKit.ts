import { AgentMode, HederaBuilder } from "@hashgraph/hedera-agent-kit";
import {
  coreConsensusPlugin,
  coreEVMPlugin,
  coreTransactionQueryPlugin
} from "@hashgraph/hedera-agent-kit/plugins";
import { getMissingHederaEnv } from "./config.js";

export interface AgentKitReadiness {
  ready: boolean;
  missing: string[];
  packageName: "@hashgraph/hedera-agent-kit";
  modes: string[];
  plugins: string[];
  builderAvailable: boolean;
  note: string;
}

export function agentKitReadiness(env: NodeJS.ProcessEnv = process.env): AgentKitReadiness {
  const missing = getMissingHederaEnv(env);
  const plugins = [
    coreConsensusPlugin.name,
    coreEVMPlugin.name,
    coreTransactionQueryPlugin.name
  ];
  const builderAvailable = typeof HederaBuilder === "function";

  return {
    ready: missing.length === 0 && builderAvailable && plugins.length === 3,
    missing,
    packageName: "@hashgraph/hedera-agent-kit",
    modes: [AgentMode.AUTONOMOUS, AgentMode.RETURN_BYTES],
    plugins,
    builderAvailable,
    note: "Hedera Agent Kit package and core plugin imports are wired for ProofRouter actions."
  };
}
