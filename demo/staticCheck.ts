import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const ROOTS = ["apps", "packages", "services", "contracts"];
const FORBIDDEN = [
  "expireOrder",
  "manualRefund",
  "timeoutRefund",
  "forceRefund",
  "settleSequential",
  "settleThenLog",
  "sequential_settle_and_log",
  "scoreRoutes",
  "route_score",
  "price_weight",
  "privacy_weight",
  "reputation_weight",
  "weighted_score",
  "PaymentAdapter",
  "ChainAdapter",
  "FallbackVerifier",
  "demoVerifier",
  "stubVerifier",
  "fakeProof",
  "mockVerifier",
  "VERIFIER_MODE",
  "MockVerifierService",
  "ERC8004AgentRegistryLite",
  "HCS_DECISIONS_TOPIC_ID",
  "HCS_RECEIPTS_TOPIC_ID",
  "HFS_ALPHA_MANIFEST_FILE_ID",
  "HFS_BETA_MANIFEST_FILE_ID",
  "HFS_GAMMA_MANIFEST_FILE_ID",
  "/api/tools duplicate MCP tool path"
];

const EXTENSIONS = [".ts", ".tsx", ".sol"];

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", "coverage", "test", "__tests__"].includes(entry.name)) {
        return [];
      }
      return walk(path);
    }
    return EXTENSIONS.some((extension) => path.endsWith(extension)) ? [path] : [];
  }));
  return files.flat();
}

const files = (await Promise.all(ROOTS.map(walk))).flat();
const violations: Array<{ file: string; pattern: string }> = [];

for (const file of files) {
  const contents = await readFile(file, "utf8");
  for (const pattern of FORBIDDEN) {
    if (contents.includes(pattern)) {
      violations.push({ file, pattern });
    }
  }
}

if (violations.length > 0) {
  console.error(JSON.stringify({ status: "fail", violations }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ status: "pass", scannedFiles: files.length }, null, 2));
