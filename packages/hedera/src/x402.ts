export interface X402Readiness {
  ready: boolean;
  missing: string[];
  network: string;
  paymentAsset: "INF";
}

export function x402Readiness(env: NodeJS.ProcessEnv = process.env): X402Readiness {
  const missing = ["X402_FACILITATOR_URL"].filter((key) => !env[key]);
  return {
    ready: missing.length === 0 && env.X402_PAYMENT_ASSET === "INF",
    missing,
    network: env.X402_NETWORK ?? "hedera-testnet",
    paymentAsset: "INF"
  };
}
