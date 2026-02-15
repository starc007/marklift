import type { SourceType } from "../utils/types.js";
import type { MarkdownResult } from "../utils/types.js";

/**
 * Escapes a frontmatter value (no newlines; colon in value may need quoting).
 */
function escapeValue(v: string): string {
  const s = v.replace(/\r?\n/g, " ").trim();
  if (s.includes(":") || s.startsWith('"') || s.includes("\n")) return `"${s.replace(/"/g, '\\"')}"`;
  return s;
}

function line(key: string, value: string | undefined): string {
  if (value === undefined || value === "") return "";
  return `${key}: ${escapeValue(value)}`;
}

/**
 * Builds website-format frontmatter and returns full markdown (frontmatter + body).
 */
function formatWebsite(result: MarkdownResult): string {
  const m = result.metadata;
  const canonical = m?.canonicalUrl ?? result.url;
  const lines: string[] = [
    line("source", result.url),
    line("canonical", canonical),
    line("title", result.title),
    line("description", result.description),
    line("image", m?.image),
    line("author", m?.author),
    line("published_at", m?.publishedAt),
    line("language", m?.language),
    line("content_hash", result.contentHash),
    line("word_count", String(result.wordCount)),
  ].filter(Boolean);
  const front = lines.join("\n");
  return `---\n${front}\n---\n\n${result.markdown}`;
}

/**
 * Parses tweet ID from Twitter/Nitter URL (e.g. /status/1234567890).
 */
function parseTweetId(url: string): string | undefined {
  const match = url.match(/\/status\/(\d+)/);
  return match?.[1];
}

/**
 * Builds twitter-format frontmatter and returns full markdown (frontmatter + body).
 */
function formatTwitter(result: MarkdownResult): string {
  const m = result.metadata;
  const tweetId = parseTweetId(result.url);
  const lines: string[] = [
    "platform: twitter",
    line("source", result.url),
    tweetId ? `tweet_id: ${tweetId}` : "",
    line("image", m?.image),
    line("published_at", m?.publishedAt),
    line("language", m?.language),
    line("content_hash", result.contentHash),
  ].filter(Boolean);
  const stats = m?.tweetStats;
  if (stats) {
    if (stats.replies !== undefined) lines.push(`replies: ${stats.replies}`);
    if (stats.retweets !== undefined) lines.push(`retweets: ${stats.retweets}`);
    if (stats.likes !== undefined) lines.push(`likes: ${stats.likes}`);
    if (stats.views !== undefined) lines.push(`views: ${stats.views}`);
  }
  if (m?.author) {
    lines.push("author:");
    lines.push(`  name: ${escapeValue(m.author)}`);
  }
  const front = lines.join("\n");
  return `---\n${front}\n---\n\n${result.markdown}`;
}

/**
 * Returns full markdown with source-specific frontmatter (website, twitter, reddit, medium).
 * Reddit and medium use website format.
 */
export function formatMarkdownWithFrontmatter(
  source: SourceType,
  result: MarkdownResult
): string {
  if (source === "twitter") return formatTwitter(result);
  return formatWebsite(result);
}
