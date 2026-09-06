# 🛠️ Development Guide

How the site is built, where things live, and what to run before you push.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18 or newer (the deploy workflow uses 20)
- **npm** 8 or newer
- **Git**
- **just** (optional) — the `justfile` wraps every npm script below
- **LaTeX** (optional) — only `npm run build:cv` needs it; the CV PDFs are
  typeset at build time and the dev server does without them

### Installation

```bash
git clone https://github.com/alexnodeland/alexnodeland.git
cd alexnodeland
npm install

# Builds the chat worker and the retrieval index, then starts Gatsby
npm run develop
```

The development server runs at `http://localhost:8000`. The first `develop`
downloads the sentence-embedding model used to index the site for the chat,
so it takes a minute longer than later ones.

## 📁 Project Structure

```text
src/
├── components/
│   ├── layout.tsx            # The shell: nav capsule, hero region, window, footer
│   ├── heroes.tsx            # One hero per path; the shell resolves its own
│   ├── seo.tsx               # <head> tags, canonical URL, JSON-LD
│   ├── animated-backgrounds/ # The six simulations, their configs, the settings panel
│   │   └── core/glyph.ts     # The "404" as a field; every simulation's 404 sequence reads it
│   ├── chat/                 # In-browser chat: worker, context, modal, welcome screen
│   ├── cv/                   # CV sections, control bar, search, exports
│   ├── expertise-icons/      # The homepage grid's icons
│   └── ui/                   # Dropdown, chips, activity heatmap, entry icons
├── config/                   # Every piece of site content that is not a post
│   ├── site.ts               # Name, description, contact, social, navigation
│   ├── homepage.ts           # About paragraphs, consulting copy, expertise grid
│   ├── cv.ts                 # The full CV; the one-page resume is derived from it
│   ├── projects.ts           # Project cards, grouped by section
│   ├── chat.ts               # Chat model, welcome message, sample prompts
│   └── retrieval.mjs         # Chunking and ranking parameters for the chat index
├── content/blog/             # Posts and press, one markdown file each
├── lib/
│   ├── chat/                 # Prompt assembly and retrieval, shared with the worker
│   ├── hooks/                # useScrollSpy
│   ├── notFound.ts           # The flag the 404 raises so the shell wears its hero
│   └── utils/                # Chat helpers, CV export (docx, markdown)
├── pages/                    # index, blog, projects, cv, 404
├── templates/blog-post.tsx   # Renders one post
├── styles/                   # SCSS: variables, mixins, one file per page and feature
└── types/                    # Shared TypeScript types

scripts/                      # Build steps: chat index, worker, CV PDFs, activity, evals
static/                       # Served as-is: CNAME, robots.txt, images
docs/                         # These guides
e2e/                          # Playwright specs
```

The shell wraps every page (`wrapPageElement` in `gatsby-browser.js` and
`gatsby-ssr.tsx`), so it mounts once and only the page inside the window
swaps on navigation. The animated backgrounds, the chat, and the settings
panel are mounted at the root (`wrapRootElement`) for the same reason.

## 🔄 Development Workflow

### 1. Content

Everything that is not a blog post is a typed config object:

```bash
# Homepage: about, consulting, expertise grid
vim src/config/homepage.ts

# CV: experience, education, skills. The one-page resume is derived
# from the same data — see docs/cv-management.md.
vim src/config/cv.ts

# Project cards
vim src/config/projects.ts

# Name, description, social links, navigation
vim src/config/site.ts
```

Blog posts and press are markdown in `src/content/blog/`, named
`YYMMDD_slug.md`, with `title`, `date`, `description`, and `category`
frontmatter. A new file is a new page; the blog list, the RSS feed, the
sitemap, and the chat index all pick it up at build time.

See [homepage-management.md](./homepage-management.md),
[cv-management.md](./cv-management.md), and
[chat-management.md](./chat-management.md) for the details of each.

### 2. Styling

```bash
# Design tokens: colours, spacing, type scale, layout insets
vim src/styles/variables.scss

# Shared mixins (outline blocks, control rows, frosted chips)
vim src/styles/mixins.scss

# One file per page or feature
vim src/styles/index.scss      # homepage
vim src/styles/layout.scss     # the shell
vim src/styles/controls.scss   # dropdowns, chips, search panels
```

The site is dark only. The simulations composite onto one constant
near-black stage so the six read as a set; there is no light theme.

### 3. Backgrounds

Each simulation lives in
`src/components/animated-backgrounds/backgrounds/<name>/` with a `config.ts`
(name, description, settings schema, defaults) and a component. Components
are lazy-loaded through their configs so three.js stays out of the page
bundles. A background takes `settings`, `frozen` (set under
`prefers-reduced-motion`: draw one frame and hold) and `notFound` (set while
the 404 page is up: play the background's 404 sequence). Every background has
one, and each is the background's own problem with the number as its input:
an initial condition for the PDE, the network itself for the two graphs, an
interference pattern of sources for the waves, fixed cells for the automaton,
an additive voice for the synth. They share the glyph field and the
graph-from-glyph construction in `core/glyph.ts`, so the one on screen when a
reader hits a missing page is the one that plays.

### 4. Running it

```bash
npm run develop        # dev server with the chat worker and index built first
npm run build          # full production build, including activity and CV PDFs
npx gatsby build       # production build without the LaTeX and GitHub steps
npm run serve          # serve the production build
npm run clean          # clear the Gatsby cache
```

## 🎨 Code Style

Prettier and ESLint run on staged files through Husky. To run them by hand:

```bash
npm run type-check     # tsc --noEmit
npm run lint           # eslint src e2e
npm run format         # prettier --write over src
npm run code-quality   # all three
```

Conventions the codebase follows:

- Functional components with hooks; props typed with an interface.
- Site copy is lowercase, except the CV.
- Comments explain why, not what — most of the longer ones record a decision
  and the alternative that was rejected.
- Content is data: a page reads its copy from `src/config`, never inline.
- Pages import components by path (`../components/seo`), not from the
  `components` barrel, which re-exports the chat and the CV exporter and
  would drag both into every page bundle.

## 🧪 Testing

```bash
npm test                   # jest: unit and integration
npm run test:coverage      # jest with coverage (what CI runs)
npm run test:e2e           # playwright, against a dev server it starts itself
npm run test:all           # everything
```

Unit tests live in `src/__tests__/unit/`, mirroring `src/`. Page tests mock
the SEO component and any heavy sibling by its module path. Playwright specs
are in `e2e/` and run against Chromium; CI runs them on every push.

The chat has its own evaluation battery — `npm run eval:chat` — described in
[chat-management.md](./chat-management.md). It downloads the model and is
not part of `npm test`.

## 🐛 Troubleshooting

**Dev server won't start, or shows stale pages**

```bash
npm run clean
npm run develop
```

**Type errors on `npm run type-check` but not in the editor**

The tests are inside `src` and are type-checked too. A page component that
takes `location` keeps it optional for that reason.

**`build:index` fails to download the embedding model**

The index is built with `@huggingface/transformers` and needs network access
on the first run. Once cached under `.cache/` it runs offline.

**The CV download links 404 in development**

The PDFs are built by `npm run build:cv`, which needs LaTeX. The dev server
does not build them; the DOCX and markdown downloads work without it.

**A background does nothing under reduced motion**

That is the design: it draws one frame and holds. Turn the OS setting off to
see it move.

## 📚 Resources

- [Gatsby Documentation](https://www.gatsbyjs.com/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [SCSS Documentation](https://sass-lang.com/documentation)
- [Playwright](https://playwright.dev/docs/intro)

## 🤝 Contributing

See the [Contributing Guide](./contributing.md).
