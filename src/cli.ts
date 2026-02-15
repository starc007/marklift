/**
 * Marklift CLI — Convert a URL to clean Markdown.
 *
 * Usage: marklift <url> [--source website|twitter|reddit|medium] [--timeout ms] [--chunk-size n] [--render-js] [--json]
 */

import { urlToMarkdown } from "./index.js";
import type { ConvertOptions, SourceType } from "./utils/types.js";
import { MarkliftError } from "./utils/errors.js";

const HELP = `
marklift <url> [options]

  URL → Clean Markdown (agent-optimized). Fetches the page, extracts main
  content, and prints Markdown to stdout.

Options:
  --source <website|twitter|reddit|medium>  Source adapter (default: website)
  --timeout <ms>               Request timeout in ms (default: 15000)
  --chunk-size <n>             Emit result.chunks with ~n chars per chunk
  --render-js                  Use headless browser (Playwright) for JS-rendered pages
  --json                       Output full result as JSON instead of markdown
  -h, --help                   Show this help
`.trim();

function parseArgs(argv: string[]): { url: string; json: boolean; options: ConvertOptions } {
  const args = argv.slice(2);
  let url = "";
  let json = false;
  const options: ConvertOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      console.log(HELP);
      process.exit(0);
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--source") {
      const next = args[++i];
      if (
        next === "website" ||
        next === "twitter" ||
        next === "reddit" ||
        next === "medium"
      ) {
        options.source = next as SourceType;
      }
      continue;
    }
    if (arg === "--timeout") {
      const next = args[++i];
      const n = Number(next);
      if (Number.isFinite(n) && n > 0) options.timeout = n;
      continue;
    }
    if (arg === "--chunk-size") {
      const next = args[++i];
      const n = Number(next);
      if (Number.isFinite(n) && n > 0) options.chunkSize = n;
      continue;
    }
    if (arg === "--render-js") {
      options.renderJs = true;
      continue;
    }
    if (!url && (arg.startsWith("http://") || arg.startsWith("https://"))) {
      url = arg;
    }
  }

  return { url, json, options };
}

async function main(): Promise<void> {
  const { url, json, options } = parseArgs(process.argv);

  if (!url) {
    console.error("marklift: missing URL");
    console.error(HELP);
    process.exit(1);
  }

  try {
    const result = await urlToMarkdown(url, options);
    if (json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      process.stdout.write(result.markdown);
      if (!result.markdown.endsWith("\n")) {
        process.stdout.write("\n");
      }
    }
  } catch (err) {
    if (err instanceof MarkliftError) {
      console.error(`marklift: ${err.message}`);
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

main();
