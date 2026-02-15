import { describe, it, expect } from "vitest";
import { urlToMarkdown, urlToMarkdownStream, InvalidUrlError, FetchError } from "marklift";

const EXAMPLE_URL = "https://example.com";

// Skip E2E when SKIP_E2E=1 (e.g. CI without network or offline)
const skipE2E = process.env.SKIP_E2E === "1";

describe.skipIf(skipE2E)("urlToMarkdown (E2E)", () => {
  it("fetches a URL and returns structured Markdown", async () => {
    const result = await urlToMarkdown(EXAMPLE_URL, {
      mode: "article",
      timeout: 15_000,
    });

    expect(result).toBeDefined();
    expect(result.url).toBe(EXAMPLE_URL);
    expect(typeof result.title).toBe("string");
    expect(result.title.length).toBeGreaterThan(0);
    expect(typeof result.markdown).toBe("string");
    expect(result.markdown.length).toBeGreaterThan(0);
    expect(Array.isArray(result.sections)).toBe(true);
    expect(Array.isArray(result.links)).toBe(true);
    expect(typeof result.wordCount).toBe("number");
    expect(result.wordCount).toBeGreaterThan(0);
  });

  it("returns sections with heading and content", async () => {
    const result = await urlToMarkdown(EXAMPLE_URL, { timeout: 15_000 });

    expect(result.sections.length).toBeGreaterThan(0);
    for (const section of result.sections) {
      expect(typeof section.heading).toBe("string");
      expect(typeof section.content).toBe("string");
    }
  });

  it("respects mode=basic (raw body)", async () => {
    const result = await urlToMarkdown(EXAMPLE_URL, {
      mode: "basic",
      timeout: 15_000,
    });

    expect(result.url).toBe(EXAMPLE_URL);
    expect(result.markdown.length).toBeGreaterThan(0);
    expect(result.wordCount).toBeGreaterThan(0);
  });

  it("supports chunkSize option", async () => {
    const result = await urlToMarkdown(EXAMPLE_URL, {
      timeout: 15_000,
      chunkSize: 500,
    });

    expect(result.chunks).toBeDefined();
    expect(Array.isArray(result.chunks)).toBe(true);
    if (result.chunks!.length > 0) {
      for (const chunk of result.chunks!) {
        expect(typeof chunk).toBe("string");
        expect(chunk.length).toBeLessThanOrEqual(600);
      }
    }
  });
});

describe.skipIf(skipE2E)("urlToMarkdownStream (E2E)", () => {
  it("yields meta, sections, and links chunks", async () => {
    const chunks: Array<{ type: string; content: string }> = [];
    for await (const chunk of urlToMarkdownStream(EXAMPLE_URL, { timeout: 15_000 })) {
      chunks.push({ type: chunk.type, content: chunk.content });
    }

    expect(chunks.length).toBeGreaterThan(0);
    const types = new Set(chunks.map((c) => c.type));
    expect(types.has("meta")).toBe(true);
    for (const c of chunks) {
      expect(typeof c.type).toBe("string");
      expect(typeof c.content).toBe("string");
    }
  });
});

describe("errors", () => {
  it("throws InvalidUrlError for invalid URL", async () => {
    await expect(urlToMarkdown("not-a-url")).rejects.toThrow(InvalidUrlError);
  });

  it("throws InvalidUrlError for non-http URL", async () => {
    await expect(urlToMarkdown("file:///etc/passwd")).rejects.toThrow(InvalidUrlError);
  });

  it.skipIf(skipE2E)("throws FetchError for non-existent host", async () => {
    await expect(
      urlToMarkdown("https://this-domain-does-not-exist-12345.invalid", {
        timeout: 3000,
      })
    ).rejects.toThrow(FetchError);
  }, 8000);
});
