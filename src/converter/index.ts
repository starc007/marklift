import TurndownService from "turndown";
import type { Section } from "../utils/types.js";

const TRACKING_PARAM_PATTERN =
  /^(utm_|fbclid|gclid|msclkid|ref|source|campaign|medium|content|term)/i;

/**
 * Strips common tracking and UTM query params from a URL.
 */
function stripTrackingParams(href: string): string {
  try {
    const u = new URL(href);
    const keys = [...u.searchParams.keys()].filter((k) =>
      TRACKING_PARAM_PATTERN.test(k)
    );
    keys.forEach((k) => u.searchParams.delete(k));
    return u.toString();
  } catch {
    return href;
  }
}

/**
 * Creates a Turndown instance with custom rules for headings, code, tables, links.
 */
function createTurndown(): TurndownService {
  const service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "_",
    strongDelimiter: "**",
    linkStyle: "inlined",
  });

  service.addRule("stripScripts", {
    filter: ["script", "style", "noscript", "svg"],
    replacement: () => "",
  });

  service.addRule("codeBlocks", {
    filter: (node) => {
      if (node.nodeName !== "PRE") return false;
      const code = node.querySelector("code");
      return Boolean(code);
    },
    replacement: (_, node) => {
      const code = (node as Element).querySelector("code");
      const lang = code?.className?.match(/language-(\w+)/)?.[1] ?? "";
      const text = code?.textContent ?? (node as Element).textContent ?? "";
      const fence = "```";
      return `\n${fence}${lang ? ` ${lang}` : ""}\n${text}\n${fence}\n`;
    },
  });

  service.addRule("links", {
    filter: "a",
    replacement: (content, node) => {
      const el = node as HTMLAnchorElement;
      const href = el.getAttribute("href");
      if (!href || !content) return content;
      const clean = stripTrackingParams(href);
      if (clean === content || content.trim() === "") return content;
      return `[${content}](${clean})`;
    },
  });

  return service;
}

/**
 * Normalize whitespace: collapse multiple blanks and blank lines.
 */
function normalizeWhitespace(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+|\s+$/gm, "");
}

/**
 * Converts HTML string to clean Markdown using Turndown with custom rules.
 *
 * @param html - HTML string (e.g. article content)
 * @returns Clean Markdown string
 */
export function htmlToMarkdown(html: string): string {
  const service = createTurndown();
  let md = service.turndown(html);
  md = normalizeWhitespace(md);
  return md.trim();
}

/**
 * Extracts links from Markdown-like text ([text](url) and raw URLs); deduplicates and strips tracking params.
 */
export function extractLinksFromMarkdown(md: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  const linkRegex = /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
  const bareUrlRegex = /https?:\/\/[^\s)\]"]+/g;
  let m: RegExpExecArray | null;
  while ((m = linkRegex.exec(md)) !== null) {
    const u = stripTrackingParams(m[2]);
    if (!seen.has(u)) {
      seen.add(u);
      urls.push(u);
    }
  }
  while ((m = bareUrlRegex.exec(md)) !== null) {
    const raw = m[0].replace(/[)\]"']+$/, "");
    const u = stripTrackingParams(raw);
    if (!seen.has(u)) {
      seen.add(u);
      urls.push(u);
    }
  }
  return urls;
}

/**
 * Splits markdown into sections by heading (# ## ###).
 */
export function splitSections(markdown: string): Section[] {
  const sections: Section[] = [];
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let lastIndex = 0;
  let lastHeading = "";
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const content = markdown
      .slice(lastIndex, match.index)
      .replace(/^\n+|\n+$/g, "");
    if (lastHeading || content) {
      sections.push({ heading: lastHeading, content });
    }
    lastHeading = match[2].trim();
    lastIndex = match.index + match[0].length;
  }

  const tail = markdown.slice(lastIndex).replace(/^\n+|\n+$/g, "");
  if (lastHeading || tail) {
    sections.push({ heading: lastHeading, content: tail });
  }

  return sections;
}

/**
 * Approximate word count (split on whitespace).
 */
export function wordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}
