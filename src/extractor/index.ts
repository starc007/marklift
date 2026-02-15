import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { ParseError } from "../utils/errors.js";
import type { ConvertMode } from "../utils/types.js";

export interface ExtractedContent {
  title: string;
  content: string;
  description?: string;
  lang?: string;
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

  if (mode === "basic") {
    const body = document.body;
    if (!body) {
      throw new ParseError("Document has no body", undefined);
    }
    const title =
      document.querySelector("title")?.textContent?.trim() ?? "";
    const content = body.innerHTML;
    const description =
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content")
        ?.trim() ?? undefined;
    return { title, content, description };
  }

  const reader = new Readability(document);
  const article = reader.parse();
  if (!article) {
    throw new ParseError("Readability could not extract article content", undefined);
  }
  return {
    title: article.title,
    content: article.content,
    description: article.excerpt ?? undefined,
    lang: article.lang ?? undefined,
  };
}
