# Contributing to Marklift

Thanks for your interest in contributing. This guide will help you get set up and submit changes.

---

## Development setup

**Requirements:** Node.js 18+

```bash
git clone https://github.com/yourusername/marklift.git
cd marklift
npm install
```

**Build:**

```bash
npm run build
```

**Run tests:**

```bash
npm test          # unit + e2e
npm run test:unit # unit only
npm run test:e2e  # e2e (real URLs; set SKIP_E2E=1 to skip)
```

**Lint / type-check:**

```bash
npm run lint
```

---

## Project structure

- **`src/adapters/`** — Source adapters (website, twitter, reddit). Add or change adapters here.
- **`src/extractor/`** — Content extraction (Readability, Nitter). Add source-specific extractors here.
- **`src/converter/`** — HTML → Markdown (Turndown rules).
- **`src/chunker/`** — Agent optimization and chunking.
- **`src/formatter/`** — Frontmatter formatting per source.
- **`src/utils/`** — Shared types and errors.
- **`src/index.ts`** — Public API and pipeline.
- **`src/cli.ts`** — CLI entry.

See [docs/context.md](docs/context.md) for a quick overview and [docs/implementation.md](docs/implementation.md) for implementation details.

---

## Code style

- **TypeScript** with strict mode. No `any` in public APIs.
- **ESM** — `"type": "module"`; use `.js` in imports for compiled paths.
- **Formatting** — Keep existing style; run the project linter before submitting.

---

## Submitting changes

1. **Open an issue** (optional but helpful) — Describe the bug or feature so we can align before you code.
2. **Fork and branch** — Create a branch from `main` (e.g. `fix/twitter-url` or `feat/new-adapter`).
3. **Make your changes** — Keep commits focused; add or update tests when relevant.
4. **Run tests and lint** — `npm test` and `npm run lint` must pass.
5. **Open a pull request** — Target `main`, describe what changed and why. Link any related issue.

---

## What to contribute

- **Bug fixes** — Especially for website, twitter (Nitter), or reddit adapters.
- **Tests** — More unit tests for converter/chunker/formatter; e2e for new adapters.
- **Docs** — Clarify README, context, or implementation docs.
- **New adapters** — Follow existing adapter pattern (fetch → extract → return `AdapterContentResult`). Discuss in an issue first.

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
