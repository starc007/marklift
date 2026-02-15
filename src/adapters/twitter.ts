import { FetchError } from "../utils/errors.js";
import type { Adapter, AdapterContentResult, AdapterOptions } from "./types.js";

const OEMBED_URL = "https://publish.twitter.com/oembed";

/**
 * Twitter/X adapter: fetches embed HTML via oEmbed API, then returns it for conversion.
 */
export const twitterAdapter: Adapter = async (
  url: string,
  options: AdapterOptions = {}
): Promise<AdapterContentResult> => {
  const timeout = options.timeout ?? 15_000;
  const oembedUrl = `${OEMBED_URL}?url=${encodeURIComponent(url)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(oembedUrl, {
      signal: controller.signal,
      headers: options.headers ?? {},
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      throw new FetchError(
        `Twitter oEmbed failed: ${res.status} ${res.statusText}`,
        url,
        res.status
      );
    }
    const data = (await res.json()) as {
      html?: string;
      title?: string;
      author_name?: string;
      author_url?: string;
    };
    const html = data.html ?? "";
    const title = data.title?.trim() ?? "Tweet";
    const description = data.author_name ? `By @${data.author_name}` : undefined;
    return {
      html: html || "<p>No content</p>",
      title,
      ...(description !== undefined && { description }),
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof FetchError) throw err;
    const message = err instanceof Error ? err.message : "Twitter oEmbed failed";
    throw new FetchError(message, url, undefined, err);
  }
};
