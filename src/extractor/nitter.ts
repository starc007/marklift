/**
 * Nitter status-page extractor.
 * Uses Nitter's HTML class names from zedeus/nitter (main-tweet, tweet-content, etc.)
 * to extract the main tweet and build semantic HTML for the pipeline.
 */

import { JSDOM } from "jsdom";
import { ParseError } from "../utils/errors.js";
import { extractMetadata } from "./index.js";
import type { ExtractedContent } from "./index.js";

function resolveUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
}

/**
 * Resolves relative hrefs in a fragment to absolute URLs.
 */
function resolveFragmentUrls(html: string, baseUrl: string): string {
  const dom = new JSDOM(`<body>${html}</body>`, { url: baseUrl });
  const doc = dom.window.document;
  doc.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    if (href && href.startsWith("/")) {
      a.setAttribute("href", resolveUrl(href, baseUrl));
    }
  });
  return doc.body.innerHTML;
}

/**
 * Extracts the main tweet from a Nitter status page using Nitter's DOM structure.
 * Builds semantic HTML (header, content, stats, quote) for htmlToMarkdown.
 *
 * Nitter structure (from zedeus/nitter src/views/status.nim, tweet.nim):
 * - .main-tweet#m wraps the main tweet
 * - .tweet-body > .tweet-header (.fullname, .username, .tweet-date), .tweet-content.media-body,
 *   .replying-to, .tweet-published, .tweet-stats, .quote
 */
export function extractNitterStatus(
  html: string,
  baseUrl: string
): ExtractedContent {
  const dom = new JSDOM(html, { url: baseUrl });
  const document = dom.window.document;

  const metadata = extractMetadata(document, baseUrl);

  const mainTweet =
    document.querySelector(".main-tweet") ?? document.querySelector("#m");
  if (!mainTweet) {
    throw new ParseError(
      "Nitter page has no .main-tweet or #m (not a status page?)",
      undefined
    );
  }

  const fullnameEl = mainTweet.querySelector(".fullname");
  const usernameEl = mainTweet.querySelector(".username");
  const fullname =
    fullnameEl?.textContent?.trim().replace(/^@/, "") ?? metadata.author ?? "";
  const username = usernameEl?.textContent?.trim() ?? "";
  const profilePath = usernameEl?.getAttribute("href")?.trim();
  const profileUrl = profilePath ? resolveUrl(profilePath, baseUrl) : "";

  const dateEl = mainTweet.querySelector(".tweet-date a");
  const publishedEl = mainTweet.querySelector(".tweet-published");
  const dateTitle = dateEl?.getAttribute("title")?.trim();
  const dateShort = dateEl?.textContent?.trim();
  const publishedText = publishedEl?.textContent?.trim();
  const dateDisplay = publishedText ?? dateTitle ?? dateShort ?? "";

  const replyingToEl = mainTweet.querySelector(".replying-to");
  const replyingTo = replyingToEl?.innerHTML?.trim();

  const contentEl = mainTweet.querySelector(".tweet-content.media-body, .tweet-content");
  const tweetContentHtml = contentEl?.innerHTML?.trim() ?? "";
  const tweetContentResolved = resolveFragmentUrls(tweetContentHtml, baseUrl);

  const statsEl = mainTweet.querySelector(".tweet-stats");
  const statEls = statsEl ? Array.from(statsEl.querySelectorAll(".tweet-stat")) : [];
  const statLabels = ["replies", "retweets", "likes", "views"] as const;
  const stats: string[] = [];
  const tweetStats: Record<string, string> = {};
  statEls.forEach((el, i) => {
    const text = (el.textContent ?? "").trim() || "0";
    const key = statLabels[i];
    if (key) {
      stats.push(`${key}: ${text}`);
      tweetStats[key] = text;
    }
  });
  const statsLine = stats.length > 0 ? stats.join(" · ") : "";

  const quoteEl = mainTweet.querySelector(".quote");
  let quoteHtml = "";
  if (quoteEl) {
    const quoteLink = quoteEl.querySelector("a.quote-link, a.unavailable-quote");
    const quoteHref = quoteLink?.getAttribute("href");
    const quoteUrl = quoteHref ? resolveUrl(quoteHref, baseUrl) : "";
    const quoteTextEl = quoteEl.querySelector(".quote-text");
    const quoteText = quoteTextEl?.innerHTML?.trim() ?? quoteEl.textContent?.trim() ?? "";
    const quoteTextResolved = quoteText ? resolveFragmentUrls(quoteText, baseUrl) : "";
    if (quoteTextResolved) {
      quoteHtml = quoteUrl
        ? `<blockquote cite="${quoteUrl}">${quoteTextResolved}<footer><a href="${quoteUrl}">Quoted tweet</a></footer></blockquote>`
        : `<blockquote>${quoteTextResolved}</blockquote>`;
    }
  }

  const title =
    metadata.title ||
    (fullname && username
      ? `Tweet by ${fullname} (${username})`
      : document.querySelector("title")?.textContent?.trim() ?? "Tweet");

  const parts: string[] = [];

  parts.push("<article class=\"tweet\">");
  parts.push("<header>");
  if (fullname && profileUrl) {
    parts.push(`<strong><a href="${profileUrl}">${escapeHtml(fullname)}</a></strong>`);
  } else if (fullname) {
    parts.push(`<strong>${escapeHtml(fullname)}</strong>`);
  }
  if (username && profileUrl) {
    parts.push(` <a href="${profileUrl}">${escapeHtml(username)}</a>`);
  } else if (username) {
    parts.push(` ${escapeHtml(username)}`);
  }
  if (dateDisplay) {
    parts.push(` · <time>${escapeHtml(dateDisplay)}</time>`);
  }
  parts.push("</header>");

  if (replyingTo) {
    parts.push(`<p class="replying-to">${replyingTo}</p>`);
  }

  parts.push(`<div class="tweet-content">${tweetContentResolved}</div>`);

  if (statsLine) {
    parts.push(`<footer class="tweet-stats">${escapeHtml(statsLine)}</footer>`);
  }

  if (quoteHtml) {
    parts.push(quoteHtml);
  }

  parts.push("</article>");

  const content = parts.join("\n");

  const author = (metadata.author ?? fullname).trim() || undefined;
  const result: ExtractedContent = {
    title,
    content,
    metadata: {
      ...metadata,
      ...(author !== undefined ? { author } : {}),
      ...(Object.keys(tweetStats).length > 0 ? { tweetStats } : {}),
    },
  };
  if (metadata.description !== undefined) result.description = metadata.description;
  return result;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
