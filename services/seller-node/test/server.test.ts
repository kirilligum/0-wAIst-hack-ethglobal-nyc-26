import { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import { buildX402Challenge, createSellerApp, createSellerReadiness, parseEscrowEvidence } from "../src/server.js";

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
  it("reports mock upstream readiness without seller provider credentials", () => {
    const readiness = createSellerReadiness({
      PROOF_ESCROW_CONTRACT_ID: "0.0.1",
      PROXY_REGISTRY_CONTRACT_ID: "0.0.2",
      X402_FACILITATOR_URL: "https://facilitator.example",
      X402_PAYMENT_ASSET: "INF"
    });

    expect(readiness.status).toBe("ready");
    expect(readiness.upstream.provider).toBe("mock");
    expect(readiness.upstream.missing).toEqual([]);
  });

  it("builds a Hedera INF x402 challenge", () => {
    const challenge = buildX402Challenge({
      HEDERA_OPERATOR_ID: "0.0.9186037",
      X402_NETWORK: "hedera-testnet",
      SELLER_MAX_BUDGET_INF: "0.5"
    });

    expect(challenge.accepts[0].asset).toBe("INF");
    expect(challenge.accepts[0].payTo).toBe("0.0.9186037");
    expect(challenge.requiredEscrowHeaders).toContain("x-0waist-request-hash");
  });

  it("validates structured escrow evidence headers", () => {
    const accepted = parseEscrowEvidence({
      "x-0waist-escrow-order-id": "12",
      "x-0waist-offer-id": "7",
      "x-0waist-request-hash": "a".repeat(64),
      "x-0waist-proof-escrow": "0.0.9226648"
    }, {
      PROOF_ESCROW_CONTRACT_ID: "0.0.9226648",
      X402_NETWORK: "hedera-testnet"
    });

    expect(accepted.status).toBe("accepted");
    if (accepted.status === "accepted") {
      expect(accepted.evidence.orderId).toBe(12);
      expect(accepted.evidence.paymentAsset).toBe("INF");
    }

    const mismatched = parseEscrowEvidence({
      "x-0waist-escrow-order-id": "12",
      "x-0waist-request-hash": "a".repeat(64),
      "x-0waist-proof-escrow": "0.0.111"
    }, {
      PROOF_ESCROW_CONTRACT_ID: "0.0.9226648"
    });

    expect(mismatched.status).toBe("blocked");
    if (mismatched.status === "blocked") {
      expect(mismatched.missing).toContain("matchingProofEscrow");
    }
  });

  it("returns 402 before completion and returns a mock completion with complete escrow evidence", async () => {
    const app = createSellerApp({
      SELLER_MODEL: "mock-llm-v1",
      X402_PAYMENT_ASSET: "INF",
      PROOF_ESCROW_CONTRACT_ID: "0.0.9226648"
    });
    const server = await listen(app);
    try {
      const unpaid = await fetch(`${server.url}/v1/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] })
      });
      expect(unpaid.status).toBe(402);

      const incomplete = await fetch(`${server.url}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-0waist-escrow-order-id": "1"
        },
        body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] })
      });
      expect(incomplete.status).toBe(402);
      expect(await incomplete.json()).toMatchObject({
        missingEscrowEvidence: expect.arrayContaining(["requestHash", "proofEscrowContractIdOrAddress"])
      });

      const paid = await fetch(`${server.url}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-0waist-escrow-order-id": "1",
          "x-0waist-request-hash": "a".repeat(64),
          "x-0waist-proof-escrow": "0.0.9226648"
        },
        body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] })
      });
      expect(paid.status).toBe(200);
      expect(await paid.json()).toMatchObject({
        id: expect.stringMatching(/^chatcmpl-mock-/),
        model: "mock-llm-v1",
        choices: [
          {
            message: {
              content: expect.stringContaining("No OpenAI, LiteLLM, or external LLM provider was called.")
            }
          }
        ]
      });
    } finally {
      await server.close();
    }
  });
});
