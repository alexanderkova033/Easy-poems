/**
 * Checks that public/cmu-stress.txt matches the current public/wordlist-en.txt.
 * If cmu-stress.txt is stale (or missing), prints a warning and exits with code 1.
 *
 * Run via: node scripts/check-cmu-stress-fresh.mjs
 * Called automatically by: npm run build
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const wordlistPath = resolve(root, "public/wordlist-en.txt");
const cmuPath = resolve(root, "public/cmu-stress.txt");

if (!existsSync(cmuPath)) {
  console.error(
    "\n\x1b[31m[check-cmu-stress]\x1b[0m public/cmu-stress.txt is missing.\n" +
    "  Run: npm run generate:cmu-stress\n",
  );
  process.exit(1);
}

if (!existsSync(wordlistPath)) {
  // wordlist missing — nothing to compare against, skip check
  process.exit(0);
}

const wordlistText = readFileSync(wordlistPath, "utf8");
const expectedHash = createHash("sha256").update(wordlistText, "utf8").digest("hex");

const cmuFirstLine = readFileSync(cmuPath, "utf8").split(/\r?\n/, 1)[0] ?? "";
const m = cmuFirstLine.match(/^#\s*wordlist-sha256:\s*([a-f0-9]{64})\s*$/i);
const actualHash = m?.[1]?.toLowerCase();

if (!actualHash || actualHash !== expectedHash) {
  console.error(
    "\n\x1b[33m[check-cmu-stress]\x1b[0m public/cmu-stress.txt is out of date for the current wordlist-en.txt.\n" +
    "  Meter hints may be inaccurate. Regenerate with:\n" +
    "    npm run generate:cmu-stress\n" +
    "  Then commit the updated cmu-stress.txt.\n",
  );
  process.exit(1);
}

console.log("\x1b[32m[check-cmu-stress]\x1b[0m cmu-stress.txt is up to date.");
