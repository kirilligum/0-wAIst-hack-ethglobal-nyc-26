export interface X402Readiness {
  ready: boolean;
  missing: string[];
  network: string;
  paymentAsset: "INF";
  facilitatorUrl?: string;
}

export function x402Readiness(env: NodeJS.ProcessEnv = process.env): X402Readiness {
  const missing = [
    ...(!env.X402_FACILITATOR_URL ? ["X402_FACILITATOR_URL"] : []),
    ...(env.X402_PAYMENT_ASSET === "INF" ? [] : ["X402_PAYMENT_ASSET=INF"])
  ];
  return {
    ready: missing.length === 0,
    missing,
    network: env.X402_NETWORK ?? "hedera-testnet",
    paymentAsset: "INF",
    facilitatorUrl: env.X402_FACILITATOR_URL
  };
}
