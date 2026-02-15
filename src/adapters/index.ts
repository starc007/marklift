import type { SourceType } from "../utils/types.js";
import type { Adapter } from "./types.js";
import { websiteAdapter } from "./website.js";
import { mediumAdapter } from "./medium.js";
import { twitterAdapter } from "./twitter.js";
import { redditAdapter } from "./reddit.js";

const adapters: Record<SourceType, Adapter> = {
  website: websiteAdapter,
  medium: mediumAdapter,
  twitter: twitterAdapter,
  reddit: redditAdapter,
};

/**
 * Returns the adapter for the given source type. Defaults to website.
 */
export function getAdapter(source: SourceType = "website"): Adapter {
  const adapter = adapters[source];
  if (!adapter) {
    throw new Error(`Unknown source: ${source}. Use website, twitter, reddit, or medium.`);
  }
  return adapter;
}

export type { Adapter, AdapterContentResult, AdapterOptions } from "./types.js";
export { websiteAdapter, mediumAdapter, twitterAdapter, redditAdapter };
