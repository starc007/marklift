import type { Metadata } from "../utils/types.js";

/**
 * Result returned by a source adapter (HTML + metadata for the pipeline).
 */
export interface AdapterContentResult {
  html: string;
  title: string;
  description?: string;
  metadata?: Metadata;
}

/**
 * Options passed to adapters for fetching.
 */
export interface AdapterOptions {
  timeout?: number;
  headers?: Record<string, string>;
  renderJs?: boolean;
}

/**
 * A source adapter: fetches and extracts content for a given URL.
 */
export type Adapter = (
  url: string,
  options: AdapterOptions
) => Promise<AdapterContentResult>;
