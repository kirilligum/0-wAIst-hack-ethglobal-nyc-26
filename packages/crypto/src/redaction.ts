const WORD_LIMIT = 18;

export function redactPrompt(prompt: string): string {
  const normalized = prompt.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "[empty prompt]";
  }

  const words = normalized.split(" ");
  const excerpt = words.slice(0, WORD_LIMIT).join(" ");
  const suffix = words.length > WORD_LIMIT ? " ..." : "";
  return `${excerpt}${suffix}`.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]");
}

export function summarizeForHistory(prompt: string): string {
  const redacted = redactPrompt(prompt);
  return redacted.length > 140 ? `${redacted.slice(0, 137)}...` : redacted;
}
