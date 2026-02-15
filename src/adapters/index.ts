import type { SourceType } from "../utils/types.js";
import type { Adapter } from "./types.js";
import { websiteAdapter } from "./website.js";
import { twitterAdapter } from "./twitter.js";
import { redditAdapter } from "./reddit.js";

const adapters: Record<SourceType, Adapter> = {
  website: websiteAdapter,
  twitter: twitterAdapter,
  reddit: redditAdapter,
};

const TWITTER_HOSTS = new Set([
  "twitter.com",
  "www.twitter.com",
  "x.com",
  "www.x.com",
  "mobile.twitter.com",
  "nitter.net",
  "www.nitter.net",
]);

const REDDIT_HOSTS = new Set([
  "reddit.com",
  "www.reddit.com",
  "new.reddit.com",
  "old.reddit.com",
]);

/**
 * Infers source type from URL host (twitter/x/nitter → twitter, reddit → reddit, else website).
 * Use when the caller does not pass an explicit source.
 */
export function inferSourceFromUrl(url: string): SourceType {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (TWITTER_HOSTS.has(host)) return "twitter";
    if (REDDIT_HOSTS.has(host)) return "reddit";
  } catch {
    /* invalid URL */
  }
  return "website";
}

/**
 * Returns the adapter for the given source type. Defaults to website.
 * Medium is not supported currently.
 */
export function getAdapter(source: SourceType = "website"): Adapter {
  const adapter = adapters[source];
  if (!adapter) {
    throw new Error(`Unknown source: ${source}. Use website, twitter, or reddit.`);
  }
  return adapter;
}

export type { Adapter, AdapterContentResult, AdapterOptions } from "./types.js";
export { websiteAdapter, twitterAdapter, redditAdapter };
