import { fetchHtml } from "../fetcher/index.js";
import { extractContent } from "../extractor/index.js";
import type { Adapter, AdapterContentResult, AdapterOptions } from "./types.js";

/**
 * Rewrites Twitter/X URLs to Nitter (nitter.net) for fetch + extract.
 * Supports: twitter.com, x.com, mobile.twitter.com.
 */
function toNitterUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const isTwitter =
      host === "twitter.com" ||
      host === "www.twitter.com" ||
      host === "x.com" ||
      host === "www.x.com" ||
      host === "mobile.twitter.com" ||
      host === "nitter.net" ||
      host === "www.nitter.net";
    if (!isTwitter) return url;
    if (host === "nitter.net" || host === "www.nitter.net") return u.href;
    u.protocol = "https:";
    u.hostname = "nitter.net";
    u.port = "";
    return u.href;
  } catch {
    return url;
  }
}

/**
 * Twitter/X adapter: user passes a Twitter/X URL only. We convert it to Nitter (nitter.net)
 * internally, fetch the page from Nitter, extract with Readability, and return the result.
 * result.url in MarkdownResult remains the original URL the user passed.
 */
export const twitterAdapter: Adapter = async (
  url: string,
  options: AdapterOptions = {}
): Promise<AdapterContentResult> => {
  const fetchUrl = toNitterUrl(url);
  const fetchOpts: { timeout?: number; headers?: Record<string, string> } = {};
  if (options.timeout !== undefined) fetchOpts.timeout = options.timeout;
  if (options.headers !== undefined) fetchOpts.headers = options.headers;

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
