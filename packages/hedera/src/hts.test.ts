import { describe, expect, it } from "vitest";
import {
  assertProductAssetInf,
  buildApproveInfAllowanceTransaction,
  getInfAccountTokenStatus,
  getInfSpenderAllowance,
  getInfWalletDiagnostics,
  INF_ASSET,
  tokenIdToEvmAddress
} from "./hts.js";

describe("HTS INF helpers", () => {
  it("keeps INF as the only product settlement asset", () => {
    expect(() => assertProductAssetInf(INF_ASSET)).not.toThrow();
    expect(() => assertProductAssetInf("HBAR")).toThrow("Product settlement asset must be INF");
  });

  it("converts HTS token IDs to EVM addresses", () => {
    expect(tokenIdToEvmAddress("0.0.123")).toBe("0x000000000000000000000000000000000000007b");
  });

  it("builds an AccountAllowanceApproveTransaction for ProofEscrow INF spend", () => {
    const transaction = buildApproveInfAllowanceTransaction({
      ownerAccountId: "0.0.9186037",
      spenderContractIdOrAddress: "0.0.9226648",
      tokenId: "0.0.9226625",
      amountBaseUnits: 50_000_000
    });

    expect(transaction.tokenApprovals).toHaveLength(1);
    const approval = transaction.tokenApprovals[0];
    expect(approval?.amount?.toNumber()).toBe(50_000_000);
    expect(approval?.ownerAccountId?.toString()).toBe("0.0.9186037");
    expect(approval?.spenderAccountId?.toString()).toBe("0.0.9226648");
  });

  it("requires a positive INF allowance amount", () => {
    expect(() => buildApproveInfAllowanceTransaction({
      ownerAccountId: "0.0.9186037",
      spenderContractIdOrAddress: "0.0.9226648",
      tokenId: "0.0.9226625",
      amountBaseUnits: 0
    })).toThrow("INF allowance amount must be a positive integer in base units");
  });

  it("reads INF association and balance from Mirror Node token relationships", async () => {
    const status = await getInfAccountTokenStatus({
      accountId: "0.0.9186037",
      tokenId: "0.0.9226625",
      async fetchImpl(url) {
        expect(String(url)).toContain("/accounts/0.0.9186037/tokens?token.id=0.0.9226625");
        return new Response(JSON.stringify({
          tokens: [
            {
              token_id: "0.0.9226625",
              balance: 123_000_000,
              decimals: 8
            }
          ],
          links: { next: null }
        }));
      }
    });

    expect(status.associated).toBe(true);
    expect(status.balanceInf).toBe(1.23);
    expect(status.missing).toEqual([]);
  });

  it("reports missing INF association when Mirror Node has no token relationship", async () => {
    const status = await getInfAccountTokenStatus({
      accountId: "0.0.5001",
      tokenId: "0.0.9226625",
      async fetchImpl() {
        return new Response(JSON.stringify({ tokens: [], links: { next: null } }));
      }
    });

    expect(status.status).toBe("ok");
    expect(status.associated).toBe(false);
    expect(status.missing).toContain("INF association");
  });

  it("reads ProofEscrow INF allowance from Mirror Node token allowances", async () => {
    const allowance = await getInfSpenderAllowance({
      ownerAccountId: "0.0.9186037",
      spenderAccountId: "0.0.9226648",
      tokenId: "0.0.9226625",
      requiredBaseUnits: 100_000_000,
      async fetchImpl(url) {
        expect(String(url)).toContain("/accounts/0.0.9186037/allowances/tokens?spender.id=0.0.9226648&token.id=0.0.9226625");
        return new Response(JSON.stringify({
          allowances: [
            {
              amount: 150_000_000,
              owner: "0.0.9186037",
              spender: "0.0.9226648",
              token_id: "0.0.9226625"
            }
          ],
          links: { next: null }
        }));
      }
    });

    expect(allowance.amountInf).toBe(1.5);
    expect(allowance.sufficientForBaseUnits).toBe(true);
    expect(allowance.missing).toEqual([]);
  });

  it("combines buyer, seller, and allowance diagnostics", async () => {
    const diagnostics = await getInfWalletDiagnostics({
      HTS_INF_TOKEN_ID: "0.0.9226625",
      HEDERA_OPERATOR_ID: "0.0.9186037",
      SELLER_HEDERA_ACCOUNT: "0.0.5001",
      PROOF_ESCROW_CONTRACT_ID: "0.0.9226648"
    }, async (url) => {
      const text = String(url);
      if (text.includes("/tokens?token.id=")) {
        return new Response(JSON.stringify({
          tokens: [
            {
              token_id: "0.0.9226625",
              balance: text.includes("0.0.9186037") ? 100_000_000 : 0,
              decimals: 8
            }
          ],
          links: { next: null }
        }));
      }
      return new Response(JSON.stringify({
        allowances: [],
        links: { next: null }
      }));
    });

    expect(diagnostics.buyer?.associated).toBe(true);
    expect(diagnostics.seller?.associated).toBe(true);
    expect(diagnostics.status).toBe("blocked");
    expect(diagnostics.missing).toContain("ProofEscrow INF allowance");
  });
});
