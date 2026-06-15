import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compileSolidityContracts } from "../../packages/hedera/src/contracts.js";

describe("contract shape", () => {
  it("compiles the three Hedera EVM contracts and exports ABIs", async () => {
    const compiled = await compileSolidityContracts();

    expect(compiled.ProxyRegistry.abi.length).toBeGreaterThan(0);
    expect(compiled.ProofEscrow.abi.length).toBeGreaterThan(0);
    expect(compiled.VerifierRegistry.abi.length).toBeGreaterThan(0);
    expect(compiled.ProofEscrow.bytecode.length).toBeGreaterThan(0);
  }, 30_000);

  it("keeps refundExpired as the timeout entrypoint", () => {
    const source = readFileSync("contracts/src/ProofEscrow.sol", "utf8");
    expect(source).toContain("function refundExpired");
    expect(source).not.toContain("function expireOrder");
    expect(source).not.toContain("function manualRefund");
  });

  it("locks INF before opening and pays only through settle or refundExpired", () => {
    const source = readFileSync("contracts/src/ProofEscrow.sol", "utf8");

    expect(source).toContain("transferFrom(msg.sender, address(this), lockedAmount)");
    expect(source).toContain("require(_recoverVerifier(receipt, verifierSignature) == receipt.verifier");
    expect(source).toContain("require(order.modelId == receipt.modelId");
    expect(source).toContain("infToken.transfer(order.seller, sellerAmount)");
    expect(source).toContain("infToken.transfer(order.buyer, refundAmount)");
  });
});
