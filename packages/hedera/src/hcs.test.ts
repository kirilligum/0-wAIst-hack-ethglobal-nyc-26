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

  it("serializes CRE receipt metadata without plaintext fields", () => {
    const payload = serializeAuditMessage({
      type: "CRE_RECEIPT",
      orderId: "order-1",
      promptHash: "a".repeat(64),
      requestHash: "b".repeat(64),
      responseHash: "c".repeat(64),
      sellerId: "alpha",
      modelId: "gpt-4.1-mini",
      creWorkflowId: "workflow-1",
      creDonId: "don-1",
      creReportHash: "d".repeat(64),
      creReportTxHash: "0.0.100@1.2",
      proofPolicyHash: "e".repeat(64),
      settlementTransactionId: "0.0.100@1.3",
      createdAt: "2026-06-13T20:00:00.000Z",
      schemaVersion: "0waist.audit.v1"
    });

    expect(payload).toContain("CRE_RECEIPT");
    expect(payload).toContain("creReportHash");
    expect(payload).not.toContain('"prompt"');
    expect(payload).not.toContain('"answer"');
  });
});
