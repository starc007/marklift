import { describe, it, expect } from "vitest";
import {
  htmlToMarkdown,
  splitSections,
  extractLinksFromMarkdown,
  wordCount,
} from "../src/converter/index.js";
import {
  optimizeForAgent,
  chunkBySize,
  buildStructuredResult,
} from "../src/chunker/index.js";
import type { Section } from "../src/utils/types.js";

describe("converter", () => {
  it("htmlToMarkdown converts simple HTML to Markdown", () => {
    const html = "<h1>Title</h1><p>Hello <strong>world</strong>.</p>";
    const md = htmlToMarkdown(html);
    expect(md).toContain("Title");
    expect(md).toContain("Hello");
    expect(md).toContain("world");
  });

  it("splitSections splits by headings", () => {
    const md = "# One\n\nContent one.\n\n## Two\n\nContent two.";
    const sections = splitSections(md);
    expect(sections.length).toBeGreaterThanOrEqual(1);
    expect(
      sections.some(
        (s: Section) => s.heading === "One" || s.content.includes("Content one")
      )
    ).toBe(true);
  });

  it("wordCount counts words", () => {
    expect(wordCount("one two three")).toBe(3);
    expect(wordCount("  a   b   c  ")).toBe(3);
  });

  it("extractLinksFromMarkdown extracts, dedupes, and sorts links", () => {
    const md = "See [b](https://b.com) and [a](https://a.com).";
    const links = extractLinksFromMarkdown(md);
    expect(links.length).toBe(2);
    expect(links.every((l: string) => l.startsWith("http"))).toBe(true);
    expect(links[0].startsWith("https://a.com")).toBe(true);
    expect(links[1].startsWith("https://b.com")).toBe(true);
    expect(links[0] <= links[1]).toBe(true);
  });
});

describe("chunker", () => {
  it("optimizeForAgent normalizes spacing", () => {
    const md = "  too   many   spaces  \n\n\n\nand   newlines  ";
    const out = optimizeForAgent(md);
    expect(out).not.toMatch(/\n{3,}/);
    expect(out.trim()).toBe(out);
  });

  it("chunkBySize returns chunks with content, index, total", () => {
    const md = "# A\n\nShort.\n\n# B\n\nAlso short.";
    const chunks = chunkBySize(md, 20);
    expect(Array.isArray(chunks)).toBe(true);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    const total = chunks.length;
    chunks.forEach((c, i) => {
      expect(c).toHaveProperty("content");
      expect(c).toHaveProperty("index", i);
      expect(c).toHaveProperty("total", total);
      expect(typeof c.content).toBe("string");
    });
  });

  it("buildStructuredResult returns sections, links, wordCount", () => {
    const md = "# Hello\n\nWorld.";
    const r = buildStructuredResult(md, "https://example.com", "Title");
    expect(r.sections.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(r.links)).toBe(true);
    expect(typeof r.wordCount).toBe("number");
    expect(r.wordCount).toBeGreaterThan(0);
  });
});
