import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("contract shape", () => {
  it("keeps refundExpired as the timeout entrypoint", () => {
    const source = readFileSync("contracts/src/ProofEscrow.sol", "utf8");
    expect(source).toContain("function refundExpired");
    expect(source).not.toContain("function expireOrder");
    expect(source).not.toContain("function manualRefund");
  });
});
