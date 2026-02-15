/**
 * Marklift: URL → Clean Markdown (Agent-Optimized)
 *
 * Fetches a URL, extracts main content, and converts to LLM-friendly Markdown.
 */

import { fetchHtml } from "./fetcher/index.js";
import { extractContent } from "./extractor/index.js";
import { htmlToMarkdown } from "./converter/index.js";
import {
  buildStructuredResult,
  optimizeForAgent,
  chunkBySize,
} from "./chunker/index.js";
import type {
  ConvertOptions,
  ConvertMode,
  MarkdownResult,
  Section,
  MarkdownChunk,
} from "./utils/types.js";

export type { ConvertOptions, ConvertMode, MarkdownResult, Section, MarkdownChunk };
export { MarkliftError, FetchError, ParseError, InvalidUrlError } from "./utils/errors.js";

/**
 * Converts a URL to clean, structured Markdown optimized for LLM/agent consumption.
 *
 * @param url - Absolute HTTP(S) URL to fetch
 * @param options - timeout, headers, mode (basic | article | docs), chunkSize
 * @returns MarkdownResult with title, markdown, sections, links, wordCount
 *
 * @example
 * ```ts
 * const result = await urlToMarkdown("https://example.com/article", {
 *   mode: "article",
 *   timeout: 10_000,
 * });
 * console.log(result.title, result.wordCount);
 * ```
 */
export async function urlToMarkdown(
  url: string,
  options: ConvertOptions = {}
): Promise<MarkdownResult> {
  const {
    timeout,
    headers,
    mode = "article",
    chunkSize,
  } = options;

  const fetchOpts: { timeout?: number; headers?: Record<string, string> } = {};
  if (timeout !== undefined) fetchOpts.timeout = timeout;
  if (headers !== undefined) fetchOpts.headers = headers;
  const html = await fetchHtml(url, fetchOpts);
  const extracted = extractContent(html, url, mode);
  let markdown = htmlToMarkdown(extracted.content);
  markdown = optimizeForAgent(markdown);

  const { sections, links, wordCount } = buildStructuredResult(
    markdown,
    url,
    extracted.title,
    extracted.description
  );

  const result: MarkdownResult = {
    url,
    title: extracted.title,
    markdown,
    sections,
    links,
    wordCount,
    ...(extracted.description !== undefined && {
      description: extracted.description,
    }),
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
