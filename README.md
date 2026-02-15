# Marklift

**URL → Clean Markdown** — Fetch a webpage, extract the main content, and convert it to LLM-friendly Markdown. Built for agents and pipelines.

- Fetches HTTP(S) URLs with configurable timeout and headers
- Extracts article content with [Mozilla Readability](https://github.com/mozilla/readability) (or raw body)
- Converts to Markdown with [Turndown](https://github.com/mixmark-io/turndown) and custom rules
- Optimizes for agents: normalizes spacing, dedupes links, strips tracking params, optional chunking
- Typed API and CLI

**Requirements:** Node.js 18+

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
  mode: "article",
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
marklift https://example.com --mode article --timeout 15000
marklift https://example.com --chunk-size 2000
```

**CLI options:**

| Option | Description |
|--------|-------------|
| `--mode <basic\|article\|docs>` | Extraction mode (default: `article`) |
| `--timeout <ms>` | Request timeout in milliseconds (default: 15000) |
| `--chunk-size <n>` | Split markdown into chunks of ~n characters |
| `--json` | Output full result as JSON instead of markdown |

---

## API

### `urlToMarkdown(url, options?)`

Converts a URL to clean Markdown. Returns a `Promise<MarkdownResult>`.

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `mode` | `"basic" \| "article" \| "docs"` | `basic` = raw body, `article` = Readability, `docs` = article + structure (default: `article`) |
| `timeout` | `number` | Request timeout in ms (default: 15000) |
| `headers` | `Record<string, string>` | Custom HTTP headers (e.g. `User-Agent`) |
| `chunkSize` | `number` | If set, `result.chunks` will contain token-safe chunks |

**Result (`MarkdownResult`):**

- `url` — Original URL
- `title` — Page title
- `description` — Meta description (if present)
- `markdown` — Full markdown string
- `sections` — `{ heading, content }[]` by heading
- `links` — Deduplicated links (tracking params stripped)
- `wordCount` — Approximate word count
- `chunks?` — Present when `chunkSize` is set

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
  mode: "article",
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

## License

MIT
