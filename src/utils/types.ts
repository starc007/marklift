/**
 * Conversion mode: basic (full page), article (Readability), or docs (structured docs).
 */
export type ConvertMode = "basic" | "article" | "docs";

/**
 * Options for urlToMarkdown conversion.
 */
export interface ConvertOptions {
  /** Use headless browser (Playwright) when true. Not implemented in basic build. */
  renderJs?: boolean;
  /** Request timeout in milliseconds. */
  timeout?: number;
  /** Custom HTTP headers (e.g. User-Agent). */
  headers?: Record<string, string>;
  /** Extraction mode: basic (raw body), article (Readability), docs (article + structure). */
  mode?: ConvertMode;
  /** Optional chunk size in characters for token-safe chunking; no chunking if omitted. */
  chunkSize?: number;
}

/**
 * A section of content under a heading.
 */
export interface Section {
  heading: string;
  content: string;
}

/**
 * Result of converting a URL to Markdown.
 */
export interface MarkdownResult {
  /** Original URL. */
  url: string;
  /** Page title. */
  title: string;
  /** Meta description if present. */
  description?: string;
  /** Full markdown string. */
  markdown: string;
  /** Sections parsed by heading. */
  sections: Section[];
  /** Unique links found in the content (tracking params stripped). */
  links: string[];
  /** Approximate word count. */
  wordCount: number;
  /** Chunks when chunkSize option is set (token-safe). */
  chunks?: string[];
}

/**
 * Chunk emitted in streaming mode.
 */
export interface MarkdownChunk {
  type: "section" | "meta" | "links";
  content: string;
  section?: Section;
}
