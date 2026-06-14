import { describe, expect, it } from "vitest";
import { agentKitReadiness } from "./agentKit.js";

describe("Hedera Agent Kit readiness", () => {
  it("loads the current Agent Kit package and core plugins", () => {
    const readiness = agentKitReadiness({
      HEDERA_OPERATOR_ID: "0.0.9186037",
      HEDERA_OPERATOR_KEY: "302e"
    });

    expect(readiness.ready).toBe(true);
    expect(readiness.packageName).toBe("@hashgraph/hedera-agent-kit");
    expect(readiness.modes).toContain("autonomous");
    expect(readiness.modes).toContain("returnBytes");
    expect(readiness.plugins).toContain("core-consensus-plugin");
    expect(readiness.plugins).toContain("core-evm-plugin");
    expect(readiness.plugins).toContain("core-transaction-query-plugin");
  });

  it("reports missing Hedera operator env", () => {
    const readiness = agentKitReadiness({});

    expect(readiness.ready).toBe(false);
    expect(readiness.missing).toEqual(["HEDERA_OPERATOR_ID", "HEDERA_OPERATOR_KEY"]);
  });
});
