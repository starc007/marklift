import { fetchHtml, BROWSER_USER_AGENT } from "../fetcher/index.js";
import { extractContent } from "../extractor/index.js";
import type { Adapter, AdapterContentResult, AdapterOptions } from "./types.js";

/**
 * Rewrites reddit.com URLs to old.reddit.com for better HTML extraction.
 */
function toOldRedditUrl(url: string): string {
  try {
    const u = new URL(url);
    if (
      u.hostname === "reddit.com" ||
      u.hostname === "www.reddit.com" ||
      u.hostname === "new.reddit.com"
    ) {
      u.hostname = "old.reddit.com";
      return u.href;
    }
    return url;
  } catch {
    return url;
  }
}

/**
 * Reddit adapter: rewrites to old.reddit.com for better extraction, then uses Readability.
 */
export const redditAdapter: Adapter = async (
  url: string,
  options: AdapterOptions = {}
): Promise<AdapterContentResult> => {
  const fetchUrl = toOldRedditUrl(url);
  const fetchOpts: { timeout?: number; headers?: Record<string, string> } = {};
  if (options.timeout !== undefined) fetchOpts.timeout = options.timeout;
  fetchOpts.headers = { "User-Agent": BROWSER_USER_AGENT, ...options.headers };
  const html = await fetchHtml(fetchUrl, fetchOpts);
  const extracted = extractContent(html, fetchUrl, "article");
  return {
    html: extracted.content,
    title: extracted.title,
    ...(extracted.description !== undefined && {
      description: extracted.description,
    }),
    ...(extracted.metadata !== undefined && { metadata: extracted.metadata }),
  };
};
