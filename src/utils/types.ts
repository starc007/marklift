/**
 * Source type: which adapter to use for fetch + extract.
 * Default is "website" if not specified.
 */
export type SourceType = "website" | "twitter" | "reddit" | "medium";

/**
 * Options for urlToMarkdown conversion.
 */
export interface ConvertOptions {
  /** Source adapter: website (default), twitter, reddit, medium. */
  source?: SourceType;
  /** Use headless browser (Playwright) when true. Some adapters (e.g. medium) enable this by default. */
  renderJs?: boolean;
  /** Request timeout in milliseconds. */
  timeout?: number;
  /** Custom HTTP headers (e.g. User-Agent). */
  headers?: Record<string, string>;
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
 * Structured metadata extracted from the page (OG, canonical, author, etc.).
 */
/** Tweet engagement stats (from Nitter/Twitter). */
export interface TweetStats {
  replies?: string;
  retweets?: string;
  likes?: string;
  views?: string;
}

export interface Metadata {
  title: string;
  description?: string;
  author?: string;
  publishedAt?: string;
  image?: string;
  canonicalUrl?: string;
  language?: string;
  /** Tweet stats when source is twitter (replies, retweets, likes, views). */
  tweetStats?: TweetStats;
}

/**
 * A single chunk with index and total for deterministic ordering.
 */
export interface MarkdownChunkItem {
  content: string;
  index: number;
  total: number;
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
  /** Sections parsed by heading (stable order). */
  sections: Section[];
  /** Unique links, sorted for deterministic output. */
  links: string[];
  /** Approximate word count. */
  wordCount: number;
  /** SHA-256 hash of optimized markdown for stability checks. */
  contentHash: string;
  /** Structured metadata (OG, canonical, author, etc.). */
  metadata?: Metadata;
  /** Chunks when chunkSize option is set (safe boundaries, index+total). */
  chunks?: MarkdownChunkItem[];
}

/**
 * Chunk emitted in streaming mode.
 */
export interface MarkdownChunk {
  type: "section" | "meta" | "links";
  content: string;
  section?: Section;
}
