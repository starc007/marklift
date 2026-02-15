# Marklift

**URL → Clean Markdown** — Fetch a webpage, extract the main content, and convert it to LLM-friendly Markdown. Built for agents and pipelines.

- Fetches HTTP(S) URLs with configurable timeout and headers
- **Optional JS rendering** — Use [Playwright](https://playwright.dev/) for JS-heavy sites (Medium, Substack, SPAs) via `renderJs: true`
- Extracts article content with [Mozilla Readability](https://github.com/mozilla/readability) (or raw body)
- Converts to Markdown with [Turndown](https://github.com/mixmark-io/turndown) and custom rules
- Optimizes for agents: normalizes spacing, dedupes links, strips tracking params, optional chunking
- Typed API and CLI

**Requirements:** Node.js 18+

**Optional:** For `renderJs` (headless browser), install Playwright: `npm install playwright`

---

## Install

```bash
npm install marklift
```

---

## Usage

### Programmatic

```ts
import { urlToMarkdown } from "marklift";

const result = await urlToMarkdown("https://example.com/article", {
  source: "website",
  timeout: 10_000,
});

console.log(result.title);
console.log(result.markdown);
console.log(result.wordCount, result.sections.length, result.links.length);
```

### CLI

```bash
# Install globally to get the `marklift` command
npm install -g marklift

# Convert a URL to Markdown (prints to stdout)
marklift https://example.com

# Output full result as JSON
marklift https://example.com --json

# Options
marklift https://example.com --source website --timeout 15000
marklift https://example.com --chunk-size 2000
marklift https://medium.com/some-post --source medium   # Medium (uses Playwright by default)
```

**CLI options:**

| Option | Description |
|--------|-------------|
| `--source <website\|twitter\|reddit\|medium>` | Source adapter (default: `website`) |
| `--timeout <ms>` | Request timeout in milliseconds (default: 15000) |
| `--chunk-size <n>` | Split markdown into chunks of ~n characters |
| `--render-js` | Use headless browser (Playwright) for JS-rendered pages |
| `--json` | Output full result as JSON instead of markdown |

---

## API

### `urlToMarkdown(url, options?)`

Converts a URL to clean Markdown. Returns a `Promise<MarkdownResult>`.

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `source` | `"website" \| "twitter" \| "reddit" \| "medium"` | Source adapter (default: `website`) |
| `timeout` | `number` | Request timeout in ms (default: 15000) |
| `headers` | `Record<string, string>` | Custom HTTP headers (e.g. `User-Agent`) |
| `renderJs` | `boolean` | Use Playwright headless browser (website only; medium uses it by default) |
| `chunkSize` | `number` | If set, `result.chunks` will contain token-safe chunks |

**Result (`MarkdownResult`):**

- `url` — Original URL
- `title` — Page title
- `description` — Meta description (if present)
- `markdown` — Full markdown string (normalized `\n`, deterministic)
- `sections` — `{ heading, content }[]` by heading (stable order)
- `links` — Deduplicated links, sorted (tracking params stripped)
- `wordCount` — Approximate word count
- `contentHash` — SHA-256 of optimized markdown (stability checks)
- `metadata?` — Structured metadata (OG, canonical, author, publishedAt, image, language)
- `chunks?` — When `chunkSize` is set: `{ content, index, total }[]` (no split inside code blocks or tables)

### `urlToMarkdownStream(url, options?)`

Async generator that yields `MarkdownChunk` (meta, sections, links) as they are produced. Useful for streaming into an LLM or pipeline.

### Errors

- `InvalidUrlError` — Invalid or non-HTTP(S) URL
- `FetchError` — Network error, timeout, or non-2xx response
- `ParseError` — Readability or parsing failure

---

## Example

```ts
import { urlToMarkdown, urlToMarkdownStream } from "marklift";

// One-shot
const result = await urlToMarkdown("https://blog.example.com/post", {
  source: "website",
  timeout: 10_000,
  chunkSize: 2000,
});
console.log(result.title, result.wordCount);
if (result.chunks) {
  for (const chunk of result.chunks) {
    // Send chunk to LLM, etc.
  }
}

// Streaming
for await (const chunk of urlToMarkdownStream("https://blog.example.com/post")) {
  process.stdout.write(chunk.content);
}
```

---

## Project structure

```
src/
  fetcher/   # URL fetching
  extractor/ # Readability / body extraction
  converter/ # HTML → Markdown (Turndown)
  chunker/   # Agent optimization & chunking
  utils/     # Types, errors
  index.ts   # Public API
  cli.ts     # CLI entry
```

---

## Testing

```bash
npm test          # unit + E2E (E2E needs network)
npm run test:unit # unit only (no network)
npm run test:e2e  # E2E with real URLs only
```

Set `SKIP_E2E=1` to skip E2E tests (e.g. in CI without network).

---

## License

MIT
