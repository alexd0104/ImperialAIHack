#!/usr/bin/env node
// Print one section of a Markdown doc, so agents never load whole files.
//   node scripts/doc.mjs TECHNICAL.md            -> list of headings (table of contents)
//   node scripts/doc.mjs TECHNICAL.md 4.3        -> section whose heading starts with "4.3"
//   node scripts/doc.mjs docs/DESIGN.md "Hear back" -> first section whose heading contains the text
// A section ends at the next heading of the same or a higher level.
import { readFileSync } from "node:fs";

const [file, query] = process.argv.slice(2);
if (!file) {
  console.error("Usage: node scripts/doc.mjs <file.md> [section number or heading text]");
  process.exit(2);
}
const lines = readFileSync(file, "utf8").split("\n");
const headings = [];
let inFence = false;
lines.forEach((line, i) => {
  if (/^```/.test(line)) inFence = !inFence;
  const m = !inFence && line.match(/^(#{1,6})\s+(.*)$/);
  if (m) headings.push({ i, level: m[1].length, text: m[2].trim() });
});

if (!query) {
  for (const h of headings) console.log(`${"  ".repeat(h.level - 1)}${h.text}`);
  process.exit(0);
}

// Case- and accent-insensitive, so "timote" finds "Timoté".
const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
const q = norm(query);
const isNumber = /^\d+(\.\d+)*$/.test(query);
const hit = headings.find((h) =>
  isNumber
    ? new RegExp(`^${query.replace(/\./g, "\\.")}(\\.|\\s|$)`).test(h.text)
    : norm(h.text).includes(q),
);
if (!hit) {
  console.error(`No section matching "${query}" in ${file}. Headings:`);
  for (const h of headings) console.error(`  ${h.text}`);
  process.exit(1);
}
const next = headings.find((h) => h.i > hit.i && h.level <= hit.level);
console.log(
  lines
    .slice(hit.i, next ? next.i : lines.length)
    .join("\n")
    .trimEnd(),
);
