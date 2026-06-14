import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createEncryptionKey, decryptJson, encryptJson, summarizeForHistory } from "@0waist/crypto";
import { PromptHistoryEntry, PromptHistoryFile, PromptHistoryFileSchema } from "@0waist/schemas";

const DEFAULT_HISTORY_PATH = ".local/prompt-history.enc";

async function readOrCreateKey(keyPath: string): Promise<Buffer> {
  const resolved = resolve(keyPath);
  try {
    return Buffer.from((await readFile(resolved, "utf8")).trim(), "base64");
  } catch {
    await mkdir(dirname(resolved), { recursive: true });
    const key = createEncryptionKey();
    await writeFile(resolved, key.toString("base64"), { mode: 0o600 });
    return key;
  }
}

export async function readPromptHistory(
  env: NodeJS.ProcessEnv = process.env
): Promise<PromptHistoryFile> {
  const key = await readOrCreateKey(env.PROMPT_HISTORY_KEY_FILE ?? ".local/prompt-history.key");
  const historyPath = resolve(env.PROMPT_HISTORY_FILE ?? DEFAULT_HISTORY_PATH);
  try {
    const encrypted = await readFile(historyPath, "utf8");
    return PromptHistoryFileSchema.parse(decryptJson<PromptHistoryFile>(encrypted, key));
  } catch {
    return { schemaVersion: "0waist.promptHistory.v1", entries: [] };
  }
}

export async function appendPromptHistory(
  entry: PromptHistoryEntry,
  env: NodeJS.ProcessEnv = process.env
): Promise<PromptHistoryFile> {
  const key = await readOrCreateKey(env.PROMPT_HISTORY_KEY_FILE ?? ".local/prompt-history.key");
  const historyPath = resolve(env.PROMPT_HISTORY_FILE ?? DEFAULT_HISTORY_PATH);
  const current = await readPromptHistory(env);
  const next: PromptHistoryFile = {
    schemaVersion: "0waist.promptHistory.v1",
    entries: [entry, ...current.entries].slice(0, 50)
  };
  await mkdir(dirname(historyPath), { recursive: true });
  await writeFile(historyPath, encryptJson(next, key), { mode: 0o600 });
  return next;
}

export function buildHistoryEntry(input: {
  orderId: string;
  sellerId: string;
  prompt: string;
  promptHash: string;
  createdAt: string;
}): PromptHistoryEntry {
  return {
    orderId: input.orderId,
    sellerId: input.sellerId,
    summary: summarizeForHistory(input.prompt),
    redactedExcerpt: summarizeForHistory(input.prompt),
    promptHash: input.promptHash,
    createdAt: input.createdAt
  };
}
