import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { ParseError } from "../utils/errors.js";
import type { ConvertMode, Metadata } from "../utils/types.js";

export interface ExtractedContent {
  title: string;
  content: string;
  description?: string;
  lang?: string;
  metadata?: Metadata;
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
 */
function extractMetadata(document: Document, baseUrl: string): Metadata {
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

  return {
    title,
    description,
    author,
    publishedAt,
    image,
    canonicalUrl,
    language,
  };
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
  mode: ConvertMode = "article"
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
    return { title, content, description, metadata };
  }

  const reader = new Readability(document);
  const article = reader.parse();
  if (!article) {
    throw new ParseError(
      "Readability could not extract article content",
      undefined
    );
  }
  return {
    title: article.title || metadata.title,
    content: article.content,
    description: article.excerpt ?? metadata.description ?? undefined,
    lang: article.lang ?? metadata.language ?? undefined,
    metadata,
  };
}
