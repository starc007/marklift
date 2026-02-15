import { fetchWithPlaywright } from "../fetcher/playwright.js";
import { extractContent } from "../extractor/index.js";
import type { Adapter, AdapterContentResult, AdapterOptions } from "./types.js";

/**
 * Medium adapter: uses Playwright by default (JS-rendered pages) and Readability.
 */
export const mediumAdapter: Adapter = async (
  url: string,
  options: AdapterOptions = {}
): Promise<AdapterContentResult> => {
  const renderJs = options.renderJs ?? true;
  const fetchOpts: { timeout?: number; headers?: Record<string, string> } = {};
  if (options.timeout !== undefined) fetchOpts.timeout = options.timeout;
  if (options.headers !== undefined) fetchOpts.headers = options.headers;

  const html = renderJs
    ? await fetchWithPlaywright(url, fetchOpts)
    : await (await import("../fetcher/index.js")).fetchHtml(url, fetchOpts);

  const extracted = extractContent(html, url, "article");
  return {
    html: extracted.content,
    title: extracted.title,
    ...(extracted.description !== undefined && {
      description: extracted.description,
    }),
    ...(extracted.metadata !== undefined && { metadata: extracted.metadata }),
  };
};
