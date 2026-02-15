import { FetchError, InvalidUrlError } from "../utils/errors.js";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_USER_AGENT =
  "Marklift/1.0 (+https://github.com/yourusername/marklift)";

/**
 * Fetches HTML from a URL with configurable timeout and headers.
 *
 * @param url - Absolute URL to fetch
 * @param options - timeout (ms), headers (e.g. User-Agent)
 * @returns Raw HTML string
 */
export async function fetchHtml(
  url: string,
  options: { timeout?: number; headers?: Record<string, string> } = {}
): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new InvalidUrlError(`Invalid URL: ${url}`, url);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new InvalidUrlError(`Only http/https URLs are allowed: ${url}`, url);
  }

  const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
  const headers: Record<string, string> = {
    "User-Agent": DEFAULT_USER_AGENT,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    ...options.headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers,
      redirect: "follow",
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      throw new FetchError(
        `HTTP ${res.status}: ${res.statusText}`,
        url,
        res.status
      );
    }
    const html = await res.text();
    return html;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof FetchError || err instanceof InvalidUrlError) throw err;
    const message =
      err instanceof Error ? err.message : "Unknown fetch error";
    const status =
      err instanceof Response ? err.status : undefined;
    throw new FetchError(message, url, status, err);
  }
}
