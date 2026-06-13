export interface DynamicReadiness {
  ready: boolean;
  missing: string[];
}

export function dynamicReadiness(env: NodeJS.ProcessEnv = process.env): DynamicReadiness {
  const missing = [
    "DYNAMIC_ENVIRONMENT_ID",
    "DYNAMIC_CLIENT_ID",
    "DYNAMIC_WALLET_POLICY_ID"
  ].filter((key) => !env[key]);
  return {
    ready: missing.length === 0,
    missing
  };
}
