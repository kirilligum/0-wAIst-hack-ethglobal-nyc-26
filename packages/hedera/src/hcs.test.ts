import { describe, expect, it } from "vitest";
import { serializeAuditMessage } from "./hcs.js";

describe("HCS audit messages", () => {
  it("serializes hash-only public payloads", () => {
    const payload = serializeAuditMessage({
      type: "DECISION",
      orderId: "order-1",
      promptHash: "a".repeat(64),
      requestHash: "b".repeat(64),
      responseHash: "c".repeat(64),
      sellerId: "alpha",
      modelId: "gpt-4.1-mini",
      createdAt: "2026-06-13T20:00:00.000Z",
      schemaVersion: "0waist.audit.v1"
    });

    expect(payload).toContain("promptHash");
    expect(payload).not.toContain('"prompt"');
    expect(payload).not.toContain('"answer"');
  });
});
