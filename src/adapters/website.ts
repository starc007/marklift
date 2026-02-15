import { fetchHtml, BROWSER_USER_AGENT } from "../fetcher/index.js";
import { extractContent } from "../extractor/index.js";
import type { Adapter, AdapterContentResult, AdapterOptions } from "./types.js";

/**
 * Website adapter: fetches HTML and extracts with Readability.
 * Uses a browser-like User-Agent so production/datacenter gets full HTML; caller can override via headers.
 */
export const websiteAdapter: Adapter = async (
  url: string,
  options: AdapterOptions = {}
): Promise<AdapterContentResult> => {
  const { timeout, headers } = options;
  const fetchOpts: { timeout?: number; headers?: Record<string, string> } = {};
  if (timeout !== undefined) fetchOpts.timeout = timeout;
  fetchOpts.headers = { "User-Agent": BROWSER_USER_AGENT, ...headers };

  const html = await fetchHtml(url, fetchOpts);

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
