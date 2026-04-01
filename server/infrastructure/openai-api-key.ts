/**
 * Normalize OPENAI_API_KEY from the environment (trim; strip UTF-8 BOM from some Windows editors).
 */
export function readOpenAiApiKey(): string | undefined {
  const raw = process.env.OPENAI_API_KEY;
  if (raw == null) return undefined;
  const k = raw.replace(/^\uFEFF/, "").trim();
  return k === "" ? undefined : k;
}
