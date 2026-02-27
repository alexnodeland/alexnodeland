# Projects Page PRD & Developer Brief

## Overview

Add a `/projects` page to alexnodeland.github.io that showcases technical work as a curated catalog with modal detail views. The page should reflect the compositional philosophy that underlies the work: complex wholes emerging from simple, well-governed parts.

-----

## Goals

1. **Showcase technical depth** — Feature foundational libraries and infrastructure that demonstrate engineering sophistication, not just applications
1. **Enable discovery** — Allow visitors to filter/browse by category and status without overwhelming navigation
1. **Keep it self-contained** — Project details render in modals rather than separate pages; external links point to GitHub, docs, or existing blog posts
1. **Signal builder identity** — Distinguish between active/maintained work and archived experiments
1. **Complement the blog** — Projects page serves as quick reference; blog posts provide deeper narrative. Both coexist and link between them where relevant

-----

## Information Architecture

```
/projects
├── Intro Section
│   └── Brief compositional philosophy (2-3 sentences)
├── Featured Section
│   └── Prominent cards for foundational work
└── Catalog Section
    ├── Filter controls (category, status)
    └── Project grid
```

### Categories

|Category        |Description                                 |Examples                                                |
|----------------|--------------------------------------------|--------------------------------------------------------|
|`library`       |Reusable primitives and core abstractions   |Fugue, Fugue-evo, Quiver                                |
|`infrastructure`|Frameworks, templates, dev tooling          |Principled, Artifactr                                   |
|`application`   |Production apps, deployed and maintained    |TBD                                                     |
|`experiment`    |Weekend projects, learning exercises, closed|Finance Crew, Crewlit, Resume Crew, Vanilla ReAct, QCSim|
|`tool`          |Personal utilities                          |RSS reader, Obsidian plugin                             |
|`fork`          |Maintained forks of external projects       |TBD                                                     |
|`research`      |Academic/research work                      |Wavelet bases for audio compression                     |

### Status

|Status    |Description                                    |
|----------|-----------------------------------------------|
|`active`  |Actively developed/maintained                  |
|`stable`  |Complete, maintained but not actively developed|
|`archived`|Closed, historical interest only               |

### Featured Flag

Projects marked `featured: true` appear in the Featured Section with enhanced visual treatment. Current featured projects:

- Fugue
- Fugue-evo
- Quiver
- Principled
- Artifactr

-----

## Project Data Model

Each project is a configuration object:

```typescript
interface Project {
  // Identity
  id: string;                    // URL-safe slug
  name: string;                  // Display name
  tagline: string;               // One-line description (< 100 chars)
  
  // Classification
  category: 'library' | 'infrastructure' | 'application' | 'experiment' | 'tool' | 'fork' | 'research';
  status: 'active' | 'stable' | 'archived';
  featured: boolean;
  
  // Content
  description: string;           // Markdown, renders in modal (200-500 words)
  highlights?: string[];         // Optional bullet points for key features/achievements
  
  // Links
  links: ProjectLink[];
  
  // Metadata
  tags: string[];                // For filtering/search: languages, domains, techniques
  year?: number;                 // Year started or published
  
  // Fork-specific (optional)
  upstream?: {
    name: string;
    url: string;
  };
  forkReason?: string;           // Brief note on modifications/why maintained
  
  // GitHub metadata (fetched at build time or client-side)
  github?: {
    repo: string;                // "owner/repo" format for API calls
    stars?: number;              // Cached star count
    lastCommit?: string;         // ISO date of last commit
  };
}

interface ProjectLink {
  type: 'github' | 'docs' | 'blog' | 'demo' | 'paper' | 'npm' | 'crates';
  url: string;
  label?: string;                // Override default label
}
```

-----

## UI Components

### Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Nav (existing)                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  # projects                                                 │
│                                                             │
│  i build systems where elegant abstractions compose into   │
│  complex behavior through well-governed local rules.        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ## featured                                                │
│                                                             │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐     │
│  │   Fugue       │ │  Fugue-evo    │ │    Quiver     │     │
│  │   [tagline]   │ │   [tagline]   │ │   [tagline]   │     │
│  │   [tags]      │ │   [tags]      │ │   [tags]      │     │
│  └───────────────┘ └───────────────┘ └───────────────┘     │
│                                                             │
│  ┌───────────────┐ ┌───────────────┐                       │
│  │  Principled   │ │   Artifactr   │                       │
│  │   [tagline]   │ │   [tagline]   │                       │
│  │   [tags]      │ │   [tags]      │                       │
│  └───────────────┘ └───────────────┘                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ## catalog                                                 │
│                                                             │
│  [all ▾] [category ▾] [status ▾]        [search...]        │
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Project │ │ Project │ │ Project │ │ Project │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Project │ │ Project │ │ Project │ │ Project │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Project Card

```
┌───────────────────────────────────┐
│  [category badge]       [status]  │
│                                   │
│  Project Name                     │
│  Tagline text here...             │
│                                   │
│  [tag] [tag] [tag]                │
│                                   │
│  ★ 42  •  Updated 3 days ago      │
│                                   │
│  [GitHub] [Docs]                  │
└───────────────────────────────────┘
```

**GitHub stats**: Show star count and relative last commit date (e.g., “3 days ago”, “2 months ago”). Omit for projects without GitHub repos.

**Featured cards** are larger (2x width or taller) with more prominent treatment.

**Fork cards** show upstream attribution: “Fork of [upstream] — [forkReason]”

### Project Modal

Triggered on card click. Contains:

- Header: name, tagline, category badge, status
- Description (rendered markdown)
- Highlights (if present)
- Links (prominent buttons)
- Tags
- For forks: upstream info and modification notes

```
┌─────────────────────────────────────────────────────────────┐
│                                              [×]            │
│  [library] [active]                                         │
│                                                             │
│  Fugue                                                      │
│  Monadic probabilistic programming for Rust                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [Description markdown rendered here. Can include code      │
│  blocks, links, etc. 200-500 words covering what it is,     │
│  why it exists, key technical decisions, current state.]    │
│                                                             │
│  **Highlights**                                             │
│  • Defunctionalized CPS monad implementation                │
│  • Type-safe probabilistic programming                      │
│  • MCMC, SMC, Variational Inference, ABC                    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [rust] [probabilistic-programming] [monads] [sampling]     │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │  GitHub  │ │   Docs   │ │   Blog   │                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

-----

## Filtering & Search

### Filter Controls

- **Category dropdown**: All, Library, Infrastructure, Application, Experiment, Tool, Fork, Research
- **Status dropdown**: All, Active, Stable, Archived
- **Text search**: Filters by name, tagline, tags (client-side)

Filters combine with AND logic. URL params update to enable sharing filtered views:
`/projects?category=library&status=active`

### Default View

- Featured section always visible (unaffected by filters)
- Catalog defaults to showing all projects, sorted by: featured first, then active before archived, then alphabetically

-----

## Visual Design

### Consistency with Existing Site

- Match existing nav, typography, color scheme
- Use same card/section patterns as homepage “how i can help” grid
- Add “projects” to main nav alongside “blog” and “cv”

### Category Badges

Subtle colored badges to distinguish categories at a glance:

|Category      |Color suggestion|
|--------------|----------------|
|library       |blue            |
|infrastructure|purple          |
|application   |green           |
|experiment    |orange          |
|tool          |gray            |
|fork          |teal            |
|research      |indigo          |

### Status Indicators

- `active`: green dot or “active” text
- `stable`: neutral/no indicator (default state)
- `archived`: muted styling, perhaps lower opacity

-----

## Data Management

### Where Projects Live

Projects defined in a single data file (JSON, YAML, or TypeScript const) that gets imported at build time:

```
/src/data/projects.ts  (or .json / .yaml)
```

This keeps project data separate from presentation logic and makes it easy to add/update projects without touching components.

### Example Project Entry

```typescript
{
  id: "fugue",
  name: "Fugue",
  tagline: "Monadic probabilistic programming for Rust",
  category: "library",
  status: "active",
  featured: true,
  description: `
Fugue is a production-ready, monadic probabilistic programming library for Rust...

## Architecture

The library uses a defunctionalized CPS monad implementation that enables...

## Inference Methods

- MCMC (Metropolis-Hastings, HMC)
- SMC (Sequential Monte Carlo)
- Variational Inference
- Approximate Bayesian Computation (ABC)
  `,
  highlights: [
    "Defunctionalized CPS monad implementation",
    "Type-safe probabilistic programming",
    "Multiple inference backends"
  ],
  links: [
    { type: "github", url: "https://github.com/alexnodeland/fugue" },
    { type: "blog", url: "/alexnodeland/blog/250819_fugue/" },
    { type: "crates", url: "https://crates.io/crates/fugue" }
  ],
  tags: ["rust", "probabilistic-programming", "monads", "mcmc", "bayesian"],
  year: 2025
}
```

-----

## Implementation Notes

### Tech Stack

Match existing site setup (appears to be Gatsby or similar static site generator with React). Key implementation points:

1. **Page component**: `/src/pages/projects.tsx` (or `.js`)
1. **Data file**: `/src/data/projects.ts`
1. **Components**:
- `ProjectCard` — renders individual project in grid
- `ProjectModal` — detail view overlay
- `ProjectFilters` — filter controls
- `FeaturedSection` — featured projects layout
- `CatalogSection` — filterable grid

### GitHub Data Fetching

For star count and last commit date, two options:

**Option A: Build-time fetch (recommended)**

- Use GitHub API during build to fetch stats for each project with a `github.repo` field
- Cache results in the build output
- Pros: No client-side API calls, no rate limiting concerns, fast page load
- Cons: Data only as fresh as last build (fine for personal site)

```javascript
// In gatsby-node.js or similar build script
const fetchGitHubStats = async (repo) => {
  const [repoData, commits] = await Promise.all([
    fetch(`https://api.github.com/repos/${repo}`),
    fetch(`https://api.github.com/repos/${repo}/commits?per_page=1`)
  ]);
  return {
    stars: repoData.stargazers_count,
    lastCommit: commits[0]?.commit?.committer?.date
  };
};
```

**Option B: Client-side fetch**

- Fetch on page load or lazily
- Pros: Always fresh
- Cons: Rate limiting (60 req/hr unauthenticated), slower initial render

Recommend Option A with a daily/weekly rebuild trigger if you want freshness.

### Accessibility

- Modal should trap focus, close on Escape
- Cards should be keyboard navigable
- Filter controls should be properly labeled
- Images (if any) need alt text

### SEO

- Page title: “projects | alex nodeland”
- Meta description: “Technical projects and open source work by Alex Nodeland — probabilistic programming, agent frameworks, audio synthesis, and development infrastructure.”
- Consider structured data for software projects (schema.org/SoftwareSourceCode)

### Performance

- Lazy load modal content if descriptions are large
- Consider virtualization if project count grows significantly (probably not needed initially)

-----

## Project Inventory (To Be Filled)

|Project                 |Category      |Status  |Featured|Links               |
|------------------------|--------------|--------|--------|--------------------|
|Fugue                   |library       |active  |✓       |github, blog, crates|
|Fugue-evo               |library       |active  |✓       |github              |
|Quiver                  |library       |active  |✓       |github              |
|Principled              |infrastructure|active  |✓       |github              |
|Artifactr               |infrastructure|active  |✓       |github              |
|Finance Crew            |experiment    |archived|        |github, blog        |
|Crewlit                 |experiment    |archived|        |github, blog        |
|Resume Crew             |experiment    |archived|        |github, blog        |
|Vanilla ReAct           |experiment    |archived|        |github, blog        |
|QCSim                   |experiment    |archived|        |github, blog        |
|Algorithm Visualizations|experiment    |stable  |        |blog                |
|RSS Reader              |tool          |?       |        |github              |
|Obsidian Plugin         |tool          |?       |        |github              |
|Wavelet Research        |research      |archived|        |blog                |
|[Forks TBD]             |fork          |?       |        |github              |

-----

## Success Criteria

1. Visitor can quickly understand the scope and nature of your technical work
1. Featured projects demonstrate genuine technical depth (not just “I used React”)
1. Clear distinction between foundational work and experiments
1. Easy to navigate, filter, and find specific projects
1. Modal detail views provide enough context without requiring external clicks
1. Page loads fast, works on mobile
1. Consistent with existing site aesthetic

-----

## Next Steps

1. [ ] Fill in project inventory with accurate statuses and links
1. [ ] Write descriptions for featured projects (Fugue, Fugue-evo, Quiver, Principled, Artifactr)
1. [ ] Build components
1. [ ] Populate data file
1. [ ] Add to navigation
1. [ ] Test and iterate