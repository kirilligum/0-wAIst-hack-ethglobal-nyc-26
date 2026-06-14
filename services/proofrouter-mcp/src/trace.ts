import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { redactPrompt } from "@0waist/crypto";
import { Offer, OrderResult, PublicTrace } from "@0waist/schemas";

export async function writeOrderTrace(input: {
  orderId: string;
  prompt: string;
  promptHash: string;
  requestHash: string;
  responseHash: string;
  selectedOffer: Offer;
  result: OrderResult;
  createdAt: string;
}): Promise<string> {
  const traceDir = resolve("runs", input.orderId);
  await mkdir(traceDir, { recursive: true });

  const publicTrace: PublicTrace = {
    orderId: input.orderId,
    promptHash: input.promptHash,
    requestHash: input.requestHash,
    responseHash: input.responseHash,
    redactedPromptExcerpt: redactPrompt(input.prompt),
    selectedSellerId: input.selectedOffer.sellerId,
    hederaTransactionId: input.result.hederaAudit.transactionId,
    createdAt: input.createdAt
  };

  await writeFile(
    resolve(traceDir, "00-user-request.redacted.json"),
    `${JSON.stringify(publicTrace, null, 2)}\n`
  );
  await writeFile(
    resolve(traceDir, "06-agent-decision.json"),
    `${JSON.stringify(input.result.decision, null, 2)}\n`
  );
  await writeFile(
    resolve(traceDir, "11-hedera-audit.json"),
    `${JSON.stringify(input.result.hederaAudit, null, 2)}\n`
  );
  await writeFile(
    resolve(traceDir, "12-final-response.redacted.json"),
    `${JSON.stringify(
      {
        orderId: input.orderId,
        responseHash: input.responseHash,
        answerLength: input.result.answer.length
      },
      null,
      2
    )}\n`
  );

  return traceDir;
}
