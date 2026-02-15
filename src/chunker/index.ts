import {
  splitSections,
  extractLinksFromMarkdown,
  wordCount,
} from "../converter/index.js";
import type { Section } from "../utils/types.js";

/**
 * Normalizes spacing: collapse multiple newlines and trim lines.
 */
function normalizeSpacing(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .replace(/^\s+|\s+$/gm, "")
    .trim();
}

/**
 * Removes duplicate consecutive lines (e.g. repeated nav/footer text).
 */
function removeDuplicateLines(text: string): string {
  const lines = text.split("\n");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const key = line.trim().toLowerCase();
    if (key === "" || !seen.has(key)) {
      seen.add(key);
      out.push(line);
    }
  }
  return out.join("\n");
}

/**
 * Removes common hidden/noise patterns (empty blocks, "skip to content" links).
 */
function removeHiddenContent(text: string): string {
  return text
    .replace(/\n*\[?\s*skip to content\s*\]?\s*\n*/gi, "\n")
    .replace(/\n*\[?\s*skip to main\s*\]?\s*\n*/gi, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Agent-optimizes markdown: normalize spacing, dedupe lines, remove hidden content.
 */
export function optimizeForAgent(markdown: string): string {
  let out = normalizeSpacing(markdown);
  out = removeDuplicateLines(out);
  out = removeHiddenContent(out);
  return normalizeSpacing(out);
}

/**
 * Splits markdown into sections and returns them with deduplicated links and word count.
 */
export function buildStructuredResult(
  markdown: string,
  _url: string,
  _title: string,
  _description?: string
): {
  sections: Section[];
  links: string[];
  wordCount: number;
} {
  const optimized = optimizeForAgent(markdown);
  const sections = splitSections(optimized);
  const links = extractLinksFromMarkdown(optimized);
  const count = wordCount(optimized);
  return { sections, links, wordCount: count };
}

/**
 * Chunks markdown by approximate character size (token-safe); preserves section boundaries when possible.
 *
 * @param markdown - Full markdown string
 * @param chunkSize - Max characters per chunk
 * @returns Array of chunk strings
 */
export function chunkBySize(markdown: string, chunkSize: number): string[] {
  if (chunkSize <= 0) return [markdown];
  const sections = splitSections(markdown);
  const chunks: string[] = [];
  let current = "";

  for (const { heading, content } of sections) {
    const block = heading ? `## ${heading}\n\n${content}` : content;
    if (current.length + block.length + 2 <= chunkSize) {
      current = current ? `${current}\n\n${block}` : block;
    } else {
      if (current) chunks.push(current);
      if (block.length <= chunkSize) {
        current = block;
      } else {
        current = "";
        const lines = block.split("\n");
        let acc = "";
        for (const line of lines) {
          if (acc.length + line.length + 1 > chunkSize && acc) {
            chunks.push(acc.trim());
            acc = line;
          } else {
            acc = acc ? `${acc}\n${line}` : line;
          }
        }
        if (acc) current = acc;
      }
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}
