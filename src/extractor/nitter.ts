/**
 * Nitter status-page extractor.
 * Uses Nitter's HTML class names from zedeus/nitter (main-tweet, tweet-content, etc.)
 * to extract the main tweet and build semantic HTML. For Twitter we output pre-built
 * markdown with explicit newlines so section headers (--- ## Tweet ---) render correctly.
 */

import { JSDOM } from "jsdom";
import { ParseError } from "../utils/errors.js";
import { extractMetadata } from "./index.js";
import type { ExtractedContent } from "./index.js";
import { htmlToMarkdown } from "../converter/index.js";

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Result of rendering a single tweet element to semantic HTML. */
interface TweetArticleResult {
  html: string;
  tweetStats: Record<string, string>;
}

/**
 * Builds semantic HTML for one tweet container (element with .tweet-body inside).
 * Used for main tweet, thread tweets, and replies.
 */
function buildTweetArticle(
  tweetContainer: Element,
  baseUrl: string
): TweetArticleResult {
  const fullnameEl = tweetContainer.querySelector(".fullname");
  const usernameEl = tweetContainer.querySelector(".username");
  const fullname = fullnameEl?.textContent?.trim().replace(/^@/, "") ?? "";
  const username = usernameEl?.textContent?.trim() ?? "";
  const profilePath = usernameEl?.getAttribute("href")?.trim();
  const profileUrl = profilePath ? resolveUrl(profilePath, baseUrl) : "";

  const dateEl = tweetContainer.querySelector(".tweet-date a");
  const publishedEl = tweetContainer.querySelector(".tweet-published");
  const dateTitle = dateEl?.getAttribute("title")?.trim();
  const dateShort = dateEl?.textContent?.trim();
  const publishedText = publishedEl?.textContent?.trim();
  const dateDisplay = publishedText ?? dateTitle ?? dateShort ?? "";

  const replyingToEl = tweetContainer.querySelector(".replying-to");
  const replyingTo = replyingToEl?.innerHTML?.trim();

  const contentEl = tweetContainer.querySelector(
    ".tweet-content.media-body, .tweet-content"
  );
  const tweetContentHtml = contentEl?.innerHTML?.trim() ?? "";
  const tweetContentResolved = resolveFragmentUrls(tweetContentHtml, baseUrl);

  const statsEl = tweetContainer.querySelector(".tweet-stats");
  const statEls = statsEl
    ? Array.from(statsEl.querySelectorAll(".tweet-stat"))
    : [];
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

  const quoteEl = tweetContainer.querySelector(".quote");
  let quoteHtml = "";
  if (quoteEl) {
    const quoteLink = quoteEl.querySelector(
      "a.quote-link, a.unavailable-quote"
    );
    const quoteHref = quoteLink?.getAttribute("href");
    const quoteUrl = quoteHref ? resolveUrl(quoteHref, baseUrl) : "";
    const quoteTextEl = quoteEl.querySelector(".quote-text");
    const quoteText =
      quoteTextEl?.innerHTML?.trim() ?? quoteEl.textContent?.trim() ?? "";
    const quoteTextResolved = quoteText
      ? resolveFragmentUrls(quoteText, baseUrl)
      : "";
    if (quoteTextResolved) {
      quoteHtml = quoteUrl
        ? `<blockquote cite="${quoteUrl}">${quoteTextResolved}<footer><a href="${quoteUrl}">Quoted tweet</a></footer></blockquote>`
        : `<blockquote>${quoteTextResolved}</blockquote>`;
    }
  }

  const parts: string[] = [];
  parts.push('<article class="tweet">');
  parts.push("<header>");
  if (fullname && profileUrl) {
    parts.push(
      `<strong><a href="${profileUrl}">${escapeHtml(fullname)}</a></strong>`
    );
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
    parts.push(
      `<footer class="tweet-stats">${escapeHtml(statsLine)}</footer>`
    );
  }

  if (quoteHtml) {
    parts.push(quoteHtml);
  }

  parts.push("</article>");

  return { html: parts.join("\n"), tweetStats };
}

/**
 * Returns tweet containers in order: thread before, main, thread after, replies.
 * Excludes .more-replies / .earlier-replies link nodes.
 */
function getTweetContainers(document: Document): {
  main: Element | null;
  threadBefore: Element[];
  threadAfter: Element[];
  replies: Element[];
} {
  const main =
    document.querySelector(".main-tweet") ?? document.querySelector("#m");
  const threadBefore = Array.from(
    document.querySelectorAll(
      ".main-thread .before-tweet .timeline-item:not(.more-replies):not(.earlier-replies)"
    )
  );
  const threadAfter = Array.from(
    document.querySelectorAll(
      ".main-thread .after-tweet .timeline-item:not(.more-replies)"
    )
  );
  const replies = Array.from(
    document.querySelectorAll(".replies .timeline-item:not(.more-replies)")
  );
  return { main, threadBefore, threadAfter, replies };
}

/**
 * Extracts the full status page: main tweet, thread (before/after), and replies.
 * Uses Nitter's HTML class names (main-tweet, timeline-item, tweet-content, etc.).
 */
export function extractNitterStatus(
  html: string,
  baseUrl: string
): ExtractedContent {
  const dom = new JSDOM(html, { url: baseUrl });
  const document = dom.window.document;

  const metadata = extractMetadata(document, baseUrl);

  const { main, threadBefore, threadAfter, replies } =
    getTweetContainers(document);

  if (!main) {
    throw new ParseError(
      "Nitter page has no .main-tweet or #m (not a status page?)",
      undefined
    );
  }

  const mainResult = buildTweetArticle(main, baseUrl);
  const fullnameEl = main.querySelector(".fullname");
  const usernameEl = main.querySelector(".username");
  const fullname =
    fullnameEl?.textContent?.trim().replace(/^@/, "") ?? metadata.author ?? "";
  const username = usernameEl?.textContent?.trim() ?? "";

  const title =
    metadata.title ||
    (fullname && username
      ? `Tweet by ${fullname} (${username})`
      : document.querySelector("title")?.textContent?.trim() ?? "Tweet");

  /** Agent-optimized: minimal newlines to save tokens. */
  const sectionBlock = (sectionTitle: string) =>
    `---\n## ${sectionTitle}\n---`;

  const trimPart = (s: string) => s.trim();
  const mdParts: string[] = [];

  mdParts.push(sectionBlock("Tweet"));
  mdParts.push(trimPart(htmlToMarkdown(mainResult.html)));

  if (threadBefore.length > 0 || threadAfter.length > 0) {
    mdParts.push(sectionBlock("Threads"));
    const threadParts: string[] = [];
    for (const el of threadBefore) {
      threadParts.push(trimPart(htmlToMarkdown(buildTweetArticle(el, baseUrl).html)));
    }
    if (threadBefore.length > 0 && threadAfter.length > 0) threadParts.push("");
    for (const el of threadAfter) {
      threadParts.push(trimPart(htmlToMarkdown(buildTweetArticle(el, baseUrl).html)));
    }
    mdParts.push(threadParts.join("\n").replace(/\n{2,}/g, "\n").trim());
  }

  if (replies.length > 0) {
    mdParts.push(sectionBlock("Replies"));
    const replyParts: string[] = [];
    for (const el of replies) {
      replyParts.push(trimPart(htmlToMarkdown(buildTweetArticle(el, baseUrl).html)));
    }
    mdParts.push(replyParts.join("\n").replace(/\n{2,}/g, "\n").trim());
  }

  const fullMarkdown = mdParts
    .filter((p) => p.length > 0)
    .join("\n")
    .replace(/\n{2,}/g, "\n")
    .trim();

  const author = (metadata.author ?? fullname).trim() || undefined;
  const result: ExtractedContent = {
    title,
    content: fullMarkdown,
    markdown: fullMarkdown,
    metadata: {
      ...metadata,
      ...(author !== undefined ? { author } : {}),
      ...(Object.keys(mainResult.tweetStats).length > 0
        ? { tweetStats: mainResult.tweetStats }
        : {}),
    },
  };
  if (metadata.description !== undefined)
    result.description = metadata.description;
  return result;
}
