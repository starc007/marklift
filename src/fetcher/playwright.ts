/// <reference path="../playwright-optional.d.ts" />
import { FetchError, InvalidUrlError } from "../utils/errors.js";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (compatible; Marklift/1.0; +https://github.com/starc007/marklift)";

/**
 * Fetches HTML from a URL using a headless browser (Playwright).
 * Use when the page requires JavaScript to render (e.g. Medium, Substack, SPAs).
 *
 * **Optional dependency:** Playwright is not installed by default. Install it when using `renderJs`:
 * ```bash
 * npm install playwright
 * ```
 *
 * @param url - Absolute URL to fetch
 * @param options - timeout (ms), headers (e.g. User-Agent)
 * @returns Rendered HTML string after page load
 */
export async function fetchWithPlaywright(
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

  // Dynamic import so Playwright is only loaded when renderJs is used (optional dependency)
  const playwright = await import("playwright").catch((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("Cannot find module") ||
      msg.includes("playwright") ||
      (e as NodeJS.ErrnoException)?.code === "MODULE_NOT_FOUND"
    ) {
      throw new Error(
        "renderJs requires Playwright. Install it with: npm install playwright"
      );
    }
    throw e;
  });
  // Type assertion avoids requiring Playwright at compile time (optional dependency)
  type PwBrowser = {
    newContext: (opts: {
      userAgent?: string;
      extraHTTPHeaders?: Record<string, string>;
      ignoreHTTPSErrors?: boolean;
    }) => Promise<{
      newPage: () => Promise<{
        goto: (
          url: string,
          opts: { waitUntil: string; timeout: number }
        ) => Promise<void>;
        content: () => Promise<string>;
      }>;
      setDefaultTimeout: (ms: number) => void;
    }>;
    close: () => Promise<void>;
  };
  const pw = playwright as {
    chromium: { launch: (opts: { headless: boolean }) => Promise<PwBrowser> };
  };

  const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
  const headers: Record<string, string> = {
    "User-Agent": DEFAULT_USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    ...options.headers,
  };

  const browser = await pw.chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: headers["User-Agent"],
      extraHTTPHeaders: headers,
      ignoreHTTPSErrors: false,
    });
    const page = await context.newPage();
    context.setDefaultTimeout(timeout);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout,
    });
    const html = await page.content();
    return html;
  } catch (err) {
    if (err instanceof InvalidUrlError) throw err;
    const message =
      err instanceof Error ? err.message : "Playwright fetch failed";
    throw new FetchError(message, url, undefined, err);
  } finally {
    await browser.close();
  }
}
