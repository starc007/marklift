import {
  splitSections,
  extractLinksFromMarkdown,
  wordCount,
} from "../converter/index.js";
import type { Section, MarkdownChunkItem } from "../utils/types.js";

/**
 * Splits markdown into "atoms" that must not be split (code blocks, tables, or other lines).
 */
function splitIntoAtoms(markdown: string): string[] {
  const atoms: string[] = [];
  const lines = markdown.split("\n");
  let i = 0;
  const codeBlockRegex = /^```(\s*\w*)\s*$/;

  while (i < lines.length) {
    const line = lines[i];
    if (line.match(codeBlockRegex)) {
      const start = i;
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) i++;
      if (i < lines.length) i++;
      atoms.push(lines.slice(start, i).join("\n"));
      continue;
    }
    if (line.trim().startsWith("|") && line.includes("|")) {
      const start = i;
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].includes("|")) i++;
      atoms.push(lines.slice(start, i).join("\n"));
      continue;
    }
    const start = i;
    while (i < lines.length) {
      const l = lines[i];
      if (l.match(codeBlockRegex) || (l.trim().startsWith("|") && l.includes("|"))) break;
      i++;
    }
    if (start < i) atoms.push(lines.slice(start, i).join("\n"));
  }
  return atoms;
}

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
 * Chunks markdown by size without splitting inside code blocks or tables.
 * Prefers section boundaries; returns index and total per chunk.
 *
 * @param markdown - Full markdown string (normalized line endings)
 * @param chunkSize - Max characters per chunk
 * @returns Array of MarkdownChunkItem with content, index, total
 */
export function chunkBySize(markdown: string, chunkSize: number): MarkdownChunkItem[] {
  if (chunkSize <= 0) {
    const normalized = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    return [{ content: normalized, index: 0, total: 1 }];
  }
  const atoms = splitIntoAtoms(markdown);
  const result: MarkdownChunkItem[] = [];
  let current = "";

  for (const atom of atoms) {
    const sep = current ? "\n\n" : "";
    if (current.length + sep.length + atom.length <= chunkSize) {
      current = current ? `${current}${sep}${atom}` : atom;
    } else {
      if (current) {
        result.push({
          content: current.trim(),
          index: result.length,
          total: 0,
        });
      }
      if (atom.length <= chunkSize) {
        current = atom;
      } else {
        result.push({
          content: atom.trim(),
          index: result.length,
          total: 0,
        });
        current = "";
      }
    }
  }
  if (current) {
    result.push({
      content: current.trim(),
      index: result.length,
      total: 0,
    });
  }
  const total = result.length;
  result.forEach((c) => (c.total = total));
  return result;
}
