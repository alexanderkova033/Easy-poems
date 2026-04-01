export function buildPlainTextTitleBody(
  title: string,
  formNote: string | undefined,
  body: string,
): string {
  const lines: string[] = [];
  const t = title.trim();
  if (t) lines.push(t, "");
  const f = formNote?.trim();
  if (f) lines.push(`(${f})`, "");
  lines.push(body);
  return lines.join("\n").replace(/\n+$/, "") + (lines.length ? "\n" : "");
}

export function buildMarkdownPoem(
  title: string,
  formNote: string | undefined,
  body: string,
): string {
  const t = title.trim();
  const f = formNote?.trim();
  const parts: string[] = [];
  if (t) parts.push(`# ${t}`, "");
  if (f) parts.push(`*${f}*`, "");
  if (body.trim()) {
    for (const line of body.split("\n")) {
      parts.push(line.length ? line : "");
    }
  }
  return parts.join("\n").replace(/\n+$/, "") + "\n";
}

function slugBase(title: string): string {
  const s = title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-|-$/g, "");
  return s.slice(0, 48) || "poem";
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportFilename(
  title: string,
  ext: "txt" | "md",
): string {
  return `${slugBase(title)}.${ext}`;
}

export async function copyTextToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
