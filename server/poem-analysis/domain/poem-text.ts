/** Formats title and lines into the user message sent to the analysis model. */
export function buildPoemPrompt(title: string, lines: string[]): string {
  const numbered = lines.map((line, i) => `${i + 1}: ${line}`).join("\n");
  const head = title?.trim() ? `Title: ${title.trim()}\n\n` : "";
  return `${head}Poem lines (1-based line numbers):\n${numbered}`;
}
