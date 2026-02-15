/**
 * Marklift: URL → Clean Markdown (Agent-Optimized)
 *
 * Fetches a URL, extracts main content, and converts to LLM-friendly Markdown.
 */

import { createHash } from "node:crypto";
import { getAdapter } from "./adapters/index.js";
import { htmlToMarkdown } from "./converter/index.js";
import {
  buildStructuredResult,
  optimizeForAgent,
  chunkBySize,
} from "./chunker/index.js";
import type {
  ConvertOptions,
  SourceType,
  MarkdownResult,
  Section,
  MarkdownChunk,
  Metadata,
  MarkdownChunkItem,
} from "./utils/types.js";

export type {
  ConvertOptions,
  SourceType,
  MarkdownResult,
  Section,
  MarkdownChunk,
  Metadata,
  MarkdownChunkItem,
};
export { MarkliftError, FetchError, ParseError, InvalidUrlError } from "./utils/errors.js";

/**
 * Converts a URL to clean, structured Markdown optimized for LLM/agent consumption.
 *
 * @param url - Absolute HTTP(S) URL to fetch
 * @param options - source (website | twitter | reddit | medium), timeout, headers, chunkSize
 * @returns MarkdownResult with title, markdown, sections, links, wordCount
 *
 * @example
 * ```ts
 * const result = await urlToMarkdown("https://example.com/article", {
 *   source: "website",
 *   timeout: 10_000,
 * });
 * const mediumResult = await urlToMarkdown("https://medium.com/...", { source: "medium" });
 * ```
 */
export async function urlToMarkdown(
  url: string,
  options: ConvertOptions = {}
): Promise<MarkdownResult> {
  const {
    source = "website",
    timeout,
    headers,
    chunkSize,
    renderJs,
  } = options;

  const adapterOpts: { timeout?: number; headers?: Record<string, string>; renderJs?: boolean } = {};
  if (timeout !== undefined) adapterOpts.timeout = timeout;
  if (headers !== undefined) adapterOpts.headers = headers;
  if (renderJs !== undefined) adapterOpts.renderJs = renderJs;

  const adapter = getAdapter(source);
  const extracted = await adapter(url, adapterOpts);

  let markdown = htmlToMarkdown(extracted.html);
  markdown = optimizeForAgent(markdown);
  markdown = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  const { sections, links, wordCount } = buildStructuredResult(
    markdown,
    url,
    extracted.title,
    extracted.description
  );

  const contentHash = createHash("sha256").update(markdown, "utf8").digest("hex");

  const result: MarkdownResult = {
    url,
    title: extracted.title,
    markdown,
    sections,
    links,
    wordCount,
    contentHash,
    ...(extracted.description !== undefined && {
      description: extracted.description,
    }),
    ...(extracted.metadata !== undefined && { metadata: extracted.metadata }),
  };

  if (chunkSize != null && chunkSize > 0) {
    result.chunks = chunkBySize(markdown, chunkSize);
  }

  return result;
}

/**
 * Streaming mode: yields chunks as they are processed (meta → sections → links).
 * Each chunk is a MarkdownChunk with type and content.
 */
export async function* urlToMarkdownStream(
  url: string,
  options: ConvertOptions = {}
): AsyncGenerator<MarkdownChunk, void, undefined> {
  const result = await urlToMarkdown(url, options);

  yield {
    type: "meta",
    content: `# ${result.title}\n\n${result.description ?? ""}\n\nURL: ${result.url}\n\n`,
  };

  for (const section of result.sections) {
    if (section.heading || section.content) {
      const content = section.heading
        ? `## ${section.heading}\n\n${section.content}`
        : section.content;
      yield { type: "section", content, section };
    }
  }

  if (result.links.length > 0) {
    yield {
      type: "links",
      content: `\n## Links\n\n${result.links.map((l) => `- ${l}`).join("\n")}\n`,
    };
  }
}
