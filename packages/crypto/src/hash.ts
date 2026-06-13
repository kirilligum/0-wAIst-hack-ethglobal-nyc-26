import { createHash } from "node:crypto";

export function sha256Hex(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function promptHash(prompt: string): string {
  return sha256Hex(`0waist.prompt.v1:${prompt}`);
}

export function requestHash(input: {
  promptHash: string;
  offerId: string;
  mode: string;
  createdAt: string;
}): string {
  return sha256Hex(JSON.stringify(input));
}
