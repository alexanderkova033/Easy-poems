/**
 * Checks that public/cmu-stress.txt was generated after public/wordlist-en.txt.
 * If cmu-stress.txt is older (or missing), prints a warning and exits with code 1.
 *
 * Run via: node scripts/check-cmu-stress-fresh.mjs
 * Called automatically by: npm run build
 */
import { statSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

const wordlistMtime = statSync(wordlistPath).mtimeMs;
const cmuMtime = statSync(cmuPath).mtimeMs;

if (cmuMtime < wordlistMtime) {
  console.error(
    "\n\x1b[33m[check-cmu-stress]\x1b[0m public/cmu-stress.txt is older than wordlist-en.txt.\n" +
    "  Meter hints may be inaccurate. Regenerate with:\n" +
    "    npm run generate:cmu-stress\n" +
    "  Then commit the updated cmu-stress.txt.\n",
  );
  process.exit(1);
}

console.log("\x1b[32m[check-cmu-stress]\x1b[0m cmu-stress.txt is up to date.");
