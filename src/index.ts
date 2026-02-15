/**
 * Marklift: URL → Clean Markdown (Agent-Optimized)
 *
 * Fetches a URL, extracts main content, and converts to LLM-friendly Markdown.
 */

import { createHash } from "node:crypto";
import { getAdapter, inferSourceFromUrl } from "./adapters/index.js";
import { toCanonicalTwitterUrl } from "./adapters/twitter.js";
import { htmlToMarkdown } from "./converter/index.js";
import {
  buildStructuredResult,
  optimizeForAgent,
  chunkBySize,
} from "./chunker/index.js";
import { formatMarkdownWithFrontmatter } from "./formatter/index.js";
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
 * @param options - source (website | twitter | reddit; inferred from URL when omitted), timeout, headers, chunkSize.
 * @returns MarkdownResult with title, markdown, sections, links, wordCount
 *
 * @example
 * ```ts
 * // source inferred from URL when omitted
 * const tweetResult = await urlToMarkdown("https://x.com/user/status/123");
 * const redditResult = await urlToMarkdown("https://reddit.com/r/...");
 * const result = await urlToMarkdown("https://example.com/article", { timeout: 10_000 });
 * ```
 */
export async function urlToMarkdown(
  url: string,
  options: ConvertOptions = {}
): Promise<MarkdownResult> {
  const { timeout, headers, chunkSize } = options;
  const source = options.source ?? inferSourceFromUrl(url);

  const adapterOpts: { timeout?: number; headers?: Record<string, string> } = {};
  if (timeout !== undefined) adapterOpts.timeout = timeout;
  if (headers !== undefined) adapterOpts.headers = headers;

  const adapter = getAdapter(source);
  const extracted = await adapter(url, adapterOpts);

  const isPrebuiltMarkdown = extracted.markdown != null;
  let markdown: string =
    extracted.markdown ?? htmlToMarkdown(extracted.html);
  if (!isPrebuiltMarkdown) {
    markdown = optimizeForAgent(markdown);
  }
  markdown = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  const { sections, links, wordCount } = buildStructuredResult(
    markdown,
    url,
    extracted.title,
    extracted.description
  );

  const contentHash = createHash("sha256").update(markdown, "utf8").digest("hex");

  const displayUrl = source === "twitter" ? toCanonicalTwitterUrl(url) : url;

  const result: MarkdownResult = {
    url: displayUrl,
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

  const formattedMarkdown = formatMarkdownWithFrontmatter(source, result);
  result.markdown = formattedMarkdown;

  if (chunkSize != null && chunkSize > 0) {
    result.chunks = chunkBySize(formattedMarkdown, chunkSize);
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
