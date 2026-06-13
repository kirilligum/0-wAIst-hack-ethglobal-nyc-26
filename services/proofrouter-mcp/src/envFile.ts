import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ENV_PATH = resolve(".env");

export async function updateEnvFile(values: Record<string, string | undefined>): Promise<void> {
  let contents = "";
  try {
    contents = await readFile(ENV_PATH, "utf8");
  } catch {
    contents = "";
  }

  const lines = contents.split(/\r?\n/);
  const seen = new Set<string>();
  const nextLines = lines.map((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (!match) {
      return line;
    }
    const key = match[1];
    if (!(key in values) || values[key] === undefined) {
      return line;
    }
    seen.add(key);
    return `${key}=${values[key]}`;
  });

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && !seen.has(key)) {
      nextLines.push(`${key}=${value}`);
    }
  }

  await writeFile(ENV_PATH, `${nextLines.join("\n").replace(/\n+$/, "")}\n`, {
    mode: 0o600
  });
}
