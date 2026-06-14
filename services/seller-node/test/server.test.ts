import { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import { buildX402Challenge, createSellerApp, createSellerReadiness } from "../src/server.js";

function listen(app: ReturnType<typeof createSellerApp>) {
  return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise<void>((done) => server.close(() => done()))
      });
    });
  });
}

describe("seller node", () => {
  it("reports blocked readiness until seller upstream credentials exist", () => {
    const readiness = createSellerReadiness({
      PROOF_ESCROW_CONTRACT_ID: "0.0.1",
      PROXY_REGISTRY_CONTRACT_ID: "0.0.2",
      X402_FACILITATOR_URL: "https://facilitator.example",
      X402_PAYMENT_ASSET: "INF"
    });

    expect(readiness.status).toBe("blocked");
    expect(readiness.upstream.missing).toContain("LITELLM_BASE_URL or OPENAI_API_KEY");
  });

  it("builds a Hedera INF x402 challenge", () => {
    const challenge = buildX402Challenge({
      HEDERA_OPERATOR_ID: "0.0.9186037",
      X402_NETWORK: "hedera-testnet",
      SELLER_MAX_BUDGET_INF: "0.5"
    });

    expect(challenge.accepts[0].asset).toBe("INF");
    expect(challenge.accepts[0].payTo).toBe("0.0.9186037");
  });

  it("returns 402 before forwarding and forwards with escrow evidence", async () => {
    const app = createSellerApp(
      {
        OPENAI_API_KEY: "test-key",
        OPENAI_MODEL: "gpt-4.1-mini",
        X402_PAYMENT_ASSET: "INF"
      },
      {
        async fetchImpl() {
          return new Response(JSON.stringify({
            id: "chatcmpl-test",
            choices: [
              {
                message: {
                  role: "assistant",
                  content: "seller response"
                }
              }
            ]
          }), {
            status: 200,
            headers: { "content-type": "application/json" }
          });
        }
      }
    );
    const server = await listen(app);
    try {
      const unpaid = await fetch(`${server.url}/v1/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] })
      });
      expect(unpaid.status).toBe(402);

      const paid = await fetch(`${server.url}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-0waist-escrow-order-id": "1"
        },
        body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] })
      });
      expect(paid.status).toBe(200);
      expect(await paid.json()).toMatchObject({ id: "chatcmpl-test" });
    } finally {
      await server.close();
    }
  });
});
