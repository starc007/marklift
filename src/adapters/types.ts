import type { Metadata } from "../utils/types.js";

/**
 * Result returned by a source adapter (HTML + metadata for the pipeline).
 * When markdown is set, pipeline uses it directly and skips htmlToMarkdown(html).
 */
export interface AdapterContentResult {
  html: string;
  title: string;
  description?: string;
  metadata?: Metadata;
  /** Pre-built markdown (e.g. Twitter); when set, pipeline uses this and skips htmlToMarkdown. */
  markdown?: string;
}

/**
 * Options passed to adapters for fetching.
 */
export interface AdapterOptions {
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * A source adapter: fetches and extracts content for a given URL.
 */
export type Adapter = (
  url: string,
  options: AdapterOptions
) => Promise<AdapterContentResult>;
