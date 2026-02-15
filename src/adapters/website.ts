import { fetchHtml } from "../fetcher/index.js";
import { fetchWithPlaywright } from "../fetcher/playwright.js";
import { extractContent } from "../extractor/index.js";
import type { Adapter, AdapterContentResult, AdapterOptions } from "./types.js";

/**
 * Website adapter: fetches HTML (fetch or Playwright) and extracts with Readability.
 * Default adapter when source is not specified.
 */
export const websiteAdapter: Adapter = async (
  url: string,
  options: AdapterOptions = {}
): Promise<AdapterContentResult> => {
  const { renderJs = false, timeout, headers } = options;
  const fetchOpts: { timeout?: number; headers?: Record<string, string> } = {};
  if (timeout !== undefined) fetchOpts.timeout = timeout;
  if (headers !== undefined) fetchOpts.headers = headers;

  const html = renderJs
    ? await fetchWithPlaywright(url, fetchOpts)
    : await fetchHtml(url, fetchOpts);

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
