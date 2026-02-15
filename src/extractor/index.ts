import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { ParseError } from "../utils/errors.js";
import type { Metadata } from "../utils/types.js";

/** Internal: extraction strategy (basic = raw body, article = Readability). */
type ExtractMode = "basic" | "article";

export interface ExtractedContent {
  title: string;
  content: string;
  description?: string;
  lang?: string;
  metadata?: Metadata;
  /** When set, adapter/pipeline should use this as final markdown (skip htmlToMarkdown). */
  markdown?: string;
}

/**
 * Resolves a possibly relative URL against baseUrl.
 */
function resolveUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
}

/**
 * Extracts structured metadata from document (OG, canonical, author, published, etc.).
 * Exported for Nitter/twitter-specific extractors.
 */
export function extractMetadata(document: Document, baseUrl: string): Metadata {
  const getMeta = (selector: string): string | undefined =>
    document.querySelector(selector)?.getAttribute("content")?.trim() ??
    undefined;

  const ogTitle = getMeta('meta[property="og:title"]');
  const ogDesc = getMeta('meta[property="og:description"]');
  const ogImage = getMeta('meta[property="og:image"]');
  const ogLocale = getMeta('meta[property="og:locale"]');
  const canonical =
    document
      .querySelector('link[rel="canonical"]')
      ?.getAttribute("href")
      ?.trim() ?? undefined;
  const author =
    getMeta('meta[name="author"]') ??
    getMeta('meta[property="article:author"]');
  const publishedAt =
    getMeta('meta[property="article:published_time"]') ??
    document
      .querySelector("time[datetime]")
      ?.getAttribute("datetime")
      ?.trim() ??
    undefined;

  const title =
    ogTitle ?? document.querySelector("title")?.textContent?.trim() ?? "";
  const description = ogDesc ?? getMeta('meta[name="description"]');
  const image = ogImage ? resolveUrl(ogImage, baseUrl) : undefined;
  const canonicalUrl = canonical ? resolveUrl(canonical, baseUrl) : undefined;
  const language =
    ogLocale ??
    document.documentElement?.getAttribute("lang")?.trim() ??
    undefined;

  const metadata: Metadata = { title };
  if (description !== undefined) metadata.description = description;
  if (author !== undefined) metadata.author = author;
  if (publishedAt !== undefined) metadata.publishedAt = publishedAt;
  if (image !== undefined) metadata.image = image;
  if (canonicalUrl !== undefined) metadata.canonicalUrl = canonicalUrl;
  if (language !== undefined) metadata.language = language;
  return metadata;
}

/**
 * Extracts main readable content from HTML using Readability (article/docs) or body (basic).
 *
 * @param html - Raw HTML string
 * @param url - Document URL (for relative links)
 * @param mode - basic (body), article (Readability), or docs
 * @returns ExtractedContent with title, content, optional description
 */
export function extractContent(
  html: string,
  url: string,
  mode: ExtractMode = "article"
): ExtractedContent {
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;

  const metadata = extractMetadata(document, url);

  if (mode === "basic") {
    const body = document.body;
    if (!body) {
      throw new ParseError("Document has no body", undefined);
    }
    const title =
      (metadata.title ||
        document.querySelector("title")?.textContent?.trim()) ??
      "";
    const content = body.innerHTML;
    const description =
      metadata.description ??
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content")
        ?.trim() ??
      undefined;
    const basicResult: ExtractedContent = { title, content, metadata };
    if (description !== undefined) basicResult.description = description;
    return basicResult;
  }

  const reader = new Readability(document);
  const article = reader.parse();
  if (!article) {
    throw new ParseError(
      "Readability could not extract article content",
      undefined
    );
  }
  const title: string =
    (article.title && article.title.trim()) || metadata.title || "";
  const content: string = article.content ?? "";
  const articleResult: ExtractedContent = { title, content, metadata };
  const desc = article.excerpt ?? metadata.description;
  if (desc !== undefined) articleResult.description = desc;
  const lang = article.lang ?? metadata.language;
  if (lang !== undefined) articleResult.lang = lang;
  return articleResult;
}
