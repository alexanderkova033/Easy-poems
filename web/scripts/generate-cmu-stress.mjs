/**
 * Builds public/cmu-stress.txt from npm cmu-pronouncing-dictionary
 * filtered to words in public/wordlist-en.txt.
 *
 * Run: node scripts/generate-cmu-stress.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { dictionary } from "cmu-pronouncing-dictionary";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function pronunciationToPattern(pron) {
  let out = "";
  for (let raw of pron.split(/\s+/)) {
    const hash = raw.indexOf("#");
    if (hash >= 0) raw = raw.slice(0, hash).trim();
    if (!raw) continue;
    const last = raw.at(-1);
    if (last === "0") out += "x";
    else if (last === "1" || last === "2") out += "/";
  }
  return out;
}

function loadWordlist() {
  const text = readFileSync(resolve(root, "public/wordlist-en.txt"), "utf8");
  const set = new Set();
  for (const line of text.split("\n")) {
    const w = line.trim().toLowerCase();
    if (w && !w.startsWith("#")) set.add(w);
  }
  return set;
}

const allow = loadWordlist();
const lines = [
  "# Stress patterns from CMU Pronouncing Dictionary (filtered). x=unstressed /=stressed syllable.",
];

let n = 0;
for (const w of [...allow].sort()) {
  const pron = dictionary[w];
  if (!pron) continue;
  const pat = pronunciationToPattern(pron);
  if (!pat) continue;
  lines.push(`${w}\t${pat}`);
  n++;
}

const outPath = resolve(root, "public/cmu-stress.txt");
writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
console.error(`Wrote ${n} entries to ${outPath}`);
