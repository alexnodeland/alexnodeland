# List available recipes
default:
    @just --list

# Install dependencies
install:
    npm install

# Start dev server
dev:
    npm run develop

# Alias for dev
start: dev

# Production build
build:
    npm run build

# Serve production build
serve:
    npm run serve

# Clean Gatsby cache and public dir
clean:
    npm run clean

# Run tests
test:
    npm test

# Run tests in watch mode
test-watch:
    npm run test:watch

# Run tests with coverage
test-coverage:
    npm run test:coverage

# Run unit tests only
test-unit:
    npm run test:unit

# Run integration tests only
test-integration:
    npm run test:integration

# Run end-to-end tests
test-e2e:
    npm run test:e2e

# Run all tests (unit + integration + e2e)
test-all:
    npm run test:all

# Lint source files
lint:
    npm run lint

# Lint and auto-fix
lint-fix:
    npm run lint:fix

# Format source files
format:
    npm run format

# Run TypeScript type checking
type-check:
    npm run type-check

# Run all code quality checks
quality:
    npm run code-quality

# Run all code quality checks with auto-fix
quality-fix:
    npm run code-quality:fix

# Re-archive the press articles linked from the blog (local copies + Wayback)
archive-press:
    ./scripts/archive-press.sh

# Typeset the downloadable CV PDFs from src/config/cv.ts (needs pdflatex)
cv:
    npm run build:cv

# Same, but keep the generated .tex next to the PDFs for debugging the template
cv-debug:
    node scripts/build-cv.js --keep


# --- evals ---------------------------------------------------------------
# Recipe comments are one line each because `just --list` shows only the last
# one. The reasoning behind each lives in docs/chat-management.md.

# Retrieval only — ~2s, no browser, no model. The loop to iterate in.
eval-retrieval:
    npm run eval:retrieval

# Grid-search the off-topic gate thresholds against the graded question set.
eval-retrieval-sweep:
    node scripts/retrieval-eval.mjs --sweep

# One graded chat run against the current production build.
eval:
    node scripts/eval-run.mjs

# Rebuild first, then run — use after changing the worker, prompt or corpus.
eval-fresh:
    node scripts/eval-run.mjs --build

# Average n runs, so a change is judged against run-to-run noise (~±0.015).
eval-repeat n='3':
    node scripts/eval-run.mjs --repeat {{n}}

# Batch across models. e.g. just eval-models "lfm-1.2b,lfm-230m" 2
eval-models models n='1':
    node scripts/eval-run.mjs --models "{{models}}" --repeat {{n}}

# Long-format CSV, one row per case per run, for a notebook.
eval-csv n='1':
    node scripts/eval-run.mjs --repeat {{n}} --format csv

# Rebuild summary.json + cases.csv from raw artifacts of a finished run.
eval-report dir:
    node scripts/eval-run.mjs --report {{dir}}

# Promote the current state to the reference the gate compares against.
eval-promote:
    node scripts/eval-run.mjs --repeat 3 --out-dir .eval/baseline

# Gate the working tree against that reference; non-zero exit on a real drop.
eval-gate:
    node scripts/eval-run.mjs --repeat 3 --baseline .eval/baseline/summary.json
