import activity from '../data/activity.json';

// Every public project, on one list, split two ways.
//
// The tier says what kind of thing it is, and so which page carries it: the
// flagship work is /projects, the small tools used every day are /apps, and
// the experiments are a short list at the foot of /projects. One list rather
// than one per page, because the CV, the chat's index, the linked data and
// the discovery file all name projects from here, and none of them should
// have to know which page a project happens to sit on.
//
// The category says what it is about. The projects page's sections mirror the
// hero subtitle — math → audio dsp → distributed systems → ai — plus a misc
// catch-all, and the subtitle links there by anchor.
export type ProjectCategory =
  'math' | 'audio-dsp' | 'distributed-systems' | 'ai' | 'misc';

export type ProjectTier = 'flagship' | 'app' | 'lab';

/** Where an app runs, which is how the apps page is grouped. */
export type AppPlatform = 'macos' | 'cli' | 'web' | 'plugins' | 'hardware';

export interface GitHubProject {
  name: string;
  description: string;
  language: string;
  tags: string[];
  url: string;
  /**
   * The project's own site, where it has one — a docs site or a landing page,
   * most of them served by github pages off the repo. Absent on the projects
   * that are only a repo, and the card draws the link only when it is here,
   * so a project that never gets a site never gets a dead mark.
   */
  site?: string;
  /**
   * The count as last typed here. The deploy fetches the real counts into
   * the activity snapshot (see scripts/build-activity.mjs), and a fetched
   * count wins; this one is what a build without a snapshot falls back to.
   */
  stars?: number;
  category: ProjectCategory;
  tier: ProjectTier;
  /** Apps only: the section of the apps page it sits in. */
  platform?: AppPlatform;
  /**
   * The one line that installs it, where there is one line. Written exactly
   * as it is typed, and only after checking it against the registry or the
   * tap it names, so a card never tells someone to run a command that fails.
   */
  install?: string;
  /** The timeline post about it, by its slug (the file name, no extension). */
  post?: string;
}

export interface ProjectsConfig {
  title: string;
  subtitle: string;
  categories: { id: ProjectCategory; title: string }[];
  /** The experiments' list at the foot of the projects page. */
  lab: { id: string; title: string; description: string };
  projects: GitHubProject[];
}

export interface AppsConfig {
  title: string;
  subtitle: string;
  platforms: {
    id: AppPlatform;
    title: string;
    /**
     * A line under the section title, for what a reader needs first. Split
     * around its one link, the way the homepage's consulting line is.
     */
    note?: {
      before: string;
      link?: { label: string; href: string };
      after?: string;
    };
  }[];
}

const TAP = 'https://github.com/alexnodeland/homebrew-tap';

// The star counts the deploy fetched, by repository name in lowercase. Absent
// from a snapshot written before the counts were fetched, and from any build
// that has never had a token, so every lookup has the typed count to fall
// back to.
const FETCHED_STARS: Record<string, number> =
  (activity as { stars?: Record<string, number> }).stars ?? {};

/** A repository's name, from its github url. */
const repoName = (url: string): string =>
  url.replace(/\/+$/, '').split('/').pop()?.toLowerCase() ?? '';

function withFetchedStars(projects: GitHubProject[]): GitHubProject[] {
  return projects.map(project => {
    const fetched = FETCHED_STARS[repoName(project.url)];
    return typeof fetched === 'number'
      ? { ...project, stars: fetched }
      : project;
  });
}

export const projectsConfig: ProjectsConfig = {
  title: 'projects',
  subtitle: 'libraries, systems, and a few experiments.',
  // Section order is by current identity — ai first — not by the hero
  // subtitle's chronology; the subtitle links land on anchors, so order here
  // is free to differ.
  categories: [
    { id: 'ai', title: 'ai' },
    { id: 'math', title: 'math' },
    { id: 'audio-dsp', title: 'audio dsp' },
    { id: 'distributed-systems', title: 'distributed systems' },
    { id: 'misc', title: 'misc' },
  ],
  lab: {
    id: 'experiments',
    title: 'experiments',
    description:
      'smaller pieces: studies, one-offs, and things built to learn something.',
  },
  projects: withFetchedStars([
    // ======================================================================
    // flagship — /projects, in sections by category
    // ======================================================================

    // --- ai ---
    {
      name: 'hoist',
      description:
        'an mcp proxy that learns which reads your agent makes next and serves them in the same tool result, so it needs fewer llm turns.',
      language: 'Rust',
      tags: ['mcp', 'agents', 'prefetching'],
      url: 'https://github.com/alexnodeland/hoist',
      site: 'https://hoist.alexnodeland.com/',
      stars: 2,
      category: 'ai',
      tier: 'flagship',
      install: 'brew install alexnodeland/tap/hoist',
      post: '260927_hoist',
    },
    {
      name: 'principled',
      description:
        'claude code plugins for specification-first development: the docs drive the plans agents execute, the review checklists, and the releases.',
      language: 'Shell',
      tags: ['claude-code', 'spec-driven', 'agents'],
      url: 'https://github.com/alexnodeland/principled',
      stars: 4,
      category: 'ai',
      tier: 'flagship',
      install: '/plugin marketplace add alexnodeland/principled',
    },

    // --- math ---
    {
      name: 'fugue',
      description:
        'a type-safe, monadic probabilistic programming library for rust.',
      language: 'Rust',
      tags: ['library', 'ppl', 'probabilistic-programming'],
      url: 'https://github.com/alexnodeland/fugue',
      site: 'https://fugue.run/',
      stars: 15,
      category: 'math',
      tier: 'flagship',
      install: 'cargo add fugue-ppl',
      post: '250819_fugue',
    },
    {
      name: 'fugue-evo',
      description:
        'a probabilistic genetic algorithm library for rust, built on fugue: evolution as inference.',
      language: 'Rust',
      tags: ['library', 'evolutionary-algorithms', 'inference'],
      url: 'https://github.com/alexnodeland/fugue-evo',
      site: 'https://evo.fugue.run/',
      stars: 2,
      category: 'math',
      tier: 'flagship',
      install: 'cargo add fugue-evo',
    },

    // --- audio dsp ---
    {
      name: 'quiver',
      description:
        'a modular audio synthesis library in rust: arrow-style combinators and graph-based patching.',
      language: 'Rust',
      tags: ['library', 'category-theory', 'modular-synthesizers'],
      url: 'https://github.com/alexnodeland/quiver',
      site: 'https://quiver-dsp.com/',
      stars: 4,
      category: 'audio-dsp',
      tier: 'flagship',
      install: 'cargo add quiver-dsp',
    },
    {
      name: 'auracle',
      description:
        'a synthesizer that evolves patches toward the ones you prefer, built on fugue-evo and quiver. it runs in the browser.',
      language: 'Rust',
      tags: ['synthesis', 'preference-learning', 'webassembly'],
      url: 'https://github.com/alexnodeland/auracle',
      site: 'https://auracle.alexnodeland.com/',
      stars: 1,
      category: 'audio-dsp',
      tier: 'flagship',
      post: '260924_auracle',
    },

    // --- distributed systems ---
    {
      name: 'lattice',
      description:
        'python libraries for apps where people and agents work together: shared artifacts, rules over event streams, typed evals, access control, and the stack they run on.',
      language: 'Python',
      tags: ['agents', 'event-driven', 'evaluation', 'human-in-the-loop'],
      url: 'https://github.com/alexnodeland/lattice',
      site: 'https://lattice.alexnodeland.com/',
      stars: 1,
      category: 'distributed-systems',
      tier: 'flagship',
      install: 'uvx copier copy gh:alexnodeland/lattice my-app',
    },

    // ======================================================================
    // apps — /apps, in sections by platform
    // ======================================================================

    // --- macos ---
    {
      name: 'curio',
      description:
        'a local-first rss and read-later reader for macos that keeps everything in your notes as plain markdown. no telemetry.',
      language: 'Rust',
      tags: ['rss', 'local-first', 'markdown'],
      url: 'https://github.com/alexnodeland/curio-rss',
      site: 'https://alexnodeland.github.io/curio-rss/',
      stars: 3,
      category: 'misc',
      tier: 'app',
      platform: 'macos',
      install: 'brew install --cask alexnodeland/tap/curio',
    },
    {
      name: 'statusbar',
      description:
        'a macos menu bar app that watches the status pages you depend on and shows the worst one at a glance.',
      language: 'Swift',
      tags: ['menu-bar', 'monitoring'],
      url: 'https://github.com/alexnodeland/StatusBar',
      site: 'https://alexnodeland.github.io/StatusBar/',
      stars: 3,
      category: 'misc',
      tier: 'app',
      platform: 'macos',
      install: 'brew install --cask alexnodeland/tap/statusbar',
      post: '260913_statusbar',
    },
    {
      name: 'whisk',
      description:
        'a rule-driven folder tidier in the macos menu bar: a small, scriptable take on hazel.',
      language: 'Swift',
      tags: ['menu-bar', 'automation'],
      url: 'https://github.com/alexnodeland/whisk',
      site: 'https://alexnodeland.github.io/whisk/',
      stars: 1,
      category: 'misc',
      tier: 'app',
      platform: 'macos',
      install: 'brew install --cask alexnodeland/tap/whisk',
    },
    {
      name: 'no-doze',
      description:
        'a menu bar wrapper around caffeinate that keeps your mac awake.',
      language: 'Swift',
      tags: ['menu-bar'],
      url: 'https://github.com/alexnodeland/no-doze',
      site: 'https://alexnodeland.github.io/no-doze/',
      stars: 1,
      category: 'misc',
      tier: 'app',
      platform: 'macos',
      install: 'brew install --cask alexnodeland/tap/no-doze',
    },
    {
      name: 'tome',
      description:
        'an offline library for technical documentation: save any docs site, search it, and let your agent read it over mcp.',
      language: 'HTML',
      tags: ['documentation', 'local-first', 'mcp'],
      url: 'https://github.com/alexnodeland/tome',
      category: 'misc',
      tier: 'app',
      platform: 'macos',
      install: 'brew install --cask alexnodeland/tap/tome',
    },

    // --- command line ---
    {
      name: 'curator',
      description:
        'a local search index over any markdown vault, served to agents over mcp, plus a digest of new notes ranked against your current interests.',
      language: 'Rust',
      tags: ['mcp', 'local-first', 'search'],
      url: 'https://github.com/alexnodeland/curator',
      site: 'https://alexnodeland.github.io/curator/',
      stars: 1,
      category: 'ai',
      tier: 'app',
      platform: 'cli',
      install: 'brew install alexnodeland/tap/curator',
    },
    {
      name: 'sleeve',
      description: 'slices one long video into a properly tagged album.',
      language: 'Rust',
      tags: ['audio', 'tagging'],
      url: 'https://github.com/alexnodeland/sleeve',
      site: 'https://alexnodeland.github.io/sleeve/',
      stars: 1,
      category: 'misc',
      tier: 'app',
      platform: 'cli',
    },

    // --- web ---
    {
      name: 'md-share',
      description:
        'a markdown renderer that supports six dialects, has text-to-speech, and compresses the whole document into a shareable url. no backend.',
      language: 'TypeScript',
      tags: ['markdown', 'url-sharing'],
      url: 'https://github.com/alexnodeland/md-share',
      site: 'https://md.alexnodeland.com/',
      stars: 5,
      category: 'misc',
      tier: 'app',
      platform: 'web',
    },

    // --- plugins and bridges ---
    {
      name: 'obsidian-github-projects',
      description:
        'an obsidian plugin for github projects: the boards, as kanban, inside your vault.',
      language: 'TypeScript',
      tags: ['obsidian', 'kanban'],
      url: 'https://github.com/alexnodeland/obsidian-github-projects',
      site: 'https://alexnodeland.github.io/obsidian-github-projects/',
      stars: 6,
      category: 'misc',
      tier: 'app',
      platform: 'plugins',
    },
    {
      name: 'claude-telegram',
      description:
        'a telegram bridge to claude code, so you can drive it from your phone.',
      language: 'TypeScript',
      tags: ['claude-code', 'telegram'],
      url: 'https://github.com/alexnodeland/claude-telegram',
      stars: 4,
      category: 'misc',
      tier: 'app',
      platform: 'plugins',
      install: 'bun add -g @alexnodeland/claude-telegram',
    },

    // --- hardware ---
    {
      name: 'lynx',
      description:
        'an open pan/tilt camera on an esp32, about $43 in parts, with a home assistant integration and an mcp server so an agent can aim it.',
      language: 'C++',
      tags: ['open-hardware', 'home-assistant', 'mcp'],
      url: 'https://github.com/alexnodeland/lynx',
      site: 'https://alexnodeland.github.io/lynx/',
      stars: 3,
      category: 'misc',
      tier: 'app',
      platform: 'hardware',
    },

    // ======================================================================
    // lab — the experiments list at the foot of /projects
    // ======================================================================
    {
      name: 'two-machines',
      description:
        'a guide to tape-delay looping, taught by letting you play it in the page.',
      language: 'TypeScript',
      tags: ['tape-delay', 'web-audio'],
      url: 'https://github.com/alexnodeland/two-machines',
      site: 'https://alexnodeland.github.io/two-machines/',
      category: 'audio-dsp',
      tier: 'lab',
    },
    {
      name: 'llmcomposer',
      description: 'an experiment in composing music with an llm.',
      language: 'Python',
      tags: ['music', 'llm'],
      url: 'https://github.com/alexnodeland/llmcomposer',
      site: 'https://alexnodeland.github.io/llmcomposer/',
      stars: 1,
      category: 'audio-dsp',
      tier: 'lab',
    },
    {
      name: 'pqc-ai-survey',
      description:
        'an interactive dashboard on quantum threats to ai systems and the post-quantum cryptography that answers them.',
      language: 'JavaScript',
      tags: ['post-quantum', 'security'],
      url: 'https://github.com/alexnodeland/pqc-ai-survey',
      site: 'https://alexnodeland.github.io/pqc-ai-survey/',
      category: 'ai',
      tier: 'lab',
    },
    {
      name: 'qcsim',
      description:
        'a small quantum circuit simulator in python, written for reading: fundamental gates and circuit assembly on numpy.',
      language: 'Python',
      tags: ['quantum-computing', 'simulation'],
      url: 'https://github.com/alexnodeland/QCSim',
      stars: 1,
      category: 'math',
      tier: 'lab',
      post: '200817_qcsim-quantum-simulator',
    },
    {
      name: 'bentokaze',
      description:
        'a linear programming calculator that minimizes bento cost while meeting nutritional requirements.',
      language: 'Python',
      tags: ['linear-programming', 'optimization'],
      url: 'https://github.com/alexnodeland/bentokaze',
      stars: 2,
      category: 'math',
      tier: 'lab',
    },
  ]),
};

export const appsConfig: AppsConfig = {
  title: 'apps',
  subtitle: 'small tools i use every day, and how to install them.',
  platforms: [
    {
      id: 'macos',
      title: 'mac apps',
      note: {
        before: 'they install from my',
        link: { label: 'homebrew tap', href: TAP },
        after:
          '. none of them is signed, so macos stops the first launch, and brew prints the way past it.',
      },
    },
    { id: 'cli', title: 'command line' },
    { id: 'web', title: 'web' },
    { id: 'plugins', title: 'plugins and bridges' },
    { id: 'hardware', title: 'hardware' },
  ],
};

/** The projects of one tier, in the config's (curated) order. */
export const projectsInTier = (
  tier: ProjectTier,
  projects: GitHubProject[] = projectsConfig.projects
): GitHubProject[] => projects.filter(project => project.tier === tier);

/** The page a project is listed on. */
export const pageForProject = (
  project: GitHubProject
): '/projects' | '/apps' => (project.tier === 'app' ? '/apps' : '/projects');

/** A post's address on the site, from its slug. */
export const postPath = (slug: string): string => `/timeline/${slug}/`;

// Helper function to get language color (GitHub-style)
export const getLanguageColor = (language: string): string => {
  const colors: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    Python: '#3572A5',
    Go: '#00ADD8',
    Rust: '#dea584',
    HCL: '#844fba',
    Shell: '#89e051',
    Java: '#b07219',
    'C++': '#f34b7d',
    C: '#555555',
    Ruby: '#701516',
    PHP: '#4F5D95',
    Swift: '#F05138',
    Kotlin: '#A97BFF',
    Scala: '#c22d40',
    HTML: '#e34c26',
    CSS: '#563d7c',
    SCSS: '#c6538c',
    Docker: '#384d54',
  };

  return colors[language] || '#6e7681';
};
