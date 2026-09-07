// The sections mirror the hero subtitle — math → audio dsp → distributed
// systems → ai — plus a misc catch-all, and the subtitle links here by
// anchor. The old groupings (featured / apps / tools / libraries /
// experiments) live on as tags on each card.
export type ProjectCategory =
  | 'math'
  | 'audio-dsp'
  | 'distributed-systems'
  | 'ai'
  | 'misc';

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
  stars?: number;
  category: ProjectCategory;
}

export interface ProjectsConfig {
  title: string;
  subtitle: string;
  categories: { id: ProjectCategory; title: string }[];
  projects: GitHubProject[];
}

export const projectsConfig: ProjectsConfig = {
  title: 'projects',
  subtitle: 'open source projects, tools, and experiments.',
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
  projects: [
    // --- math ---
    {
      name: 'fugue',
      description:
        'a type-safe, monadic probabilistic programming library for rust.',
      language: 'Rust',
      tags: ['featured', 'library', 'ppl', 'probabilistic-programming'],
      url: 'https://github.com/alexnodeland/fugue',
      site: 'https://fugue.run/',
      stars: 12,
      category: 'math',
    },
    {
      name: 'fugue-evo',
      description:
        'a probabilistic genetic algorithm library for rust: evolution as inference.',
      language: 'Rust',
      tags: ['library', 'evolutionary-algorithms', 'inference'],
      url: 'https://github.com/alexnodeland/fugue-evo',
      site: 'https://evo.fugue.run/',
      stars: 2,
      category: 'math',
    },
    {
      name: 'bentokaze',
      description:
        'a linear programming calculator that minimizes bento cost while meeting nutritional requirements.',
      language: 'Python',
      tags: ['experiment', 'linear-programming', 'optimization'],
      url: 'https://github.com/alexnodeland/bentokaze',
      stars: 2,
      category: 'math',
    },

    // --- audio dsp ---
    {
      name: 'quiver',
      description:
        'a modular audio synthesis library using arrow-style combinators and graph-based patching.',
      language: 'Rust',
      tags: ['featured', 'library', 'category-theory', 'modular-synthesizers'],
      url: 'https://github.com/alexnodeland/quiver',
      site: 'https://quiver-dsp.com/',
      stars: 3,
      category: 'audio-dsp',
    },
    {
      name: 'auracle',
      description:
        'a synthesizer that evolves patches toward the ones you prefer, built on fugue-evo and quiver.',
      language: 'Rust',
      tags: ['app', 'synthesis', 'preference-learning'],
      url: 'https://github.com/alexnodeland/auracle',
      site: 'https://alexnodeland.github.io/auracle/',
      stars: 1,
      category: 'audio-dsp',
    },
    {
      name: 'sleeve',
      description: 'slices one long video into a properly tagged album.',
      language: 'Rust',
      tags: ['tool', 'cli', 'audio'],
      url: 'https://github.com/alexnodeland/sleeve',
      site: 'https://alexnodeland.github.io/sleeve/',
      stars: 1,
      category: 'misc',
    },
    {
      name: 'llmcomposer',
      description:
        'an experiment in composing music with an llm, and in how much musical understanding language models have.',
      language: 'Python',
      tags: ['experiment', 'music', 'llm'],
      url: 'https://github.com/alexnodeland/llmcomposer',
      site: 'https://alexnodeland.github.io/llmcomposer/',
      stars: 1,
      category: 'audio-dsp',
    },

    // --- distributed systems ---
    {
      name: 'reflex',
      description: 'a template for real-time ai agent systems.',
      language: 'Python',
      tags: ['tool', 'real-time', 'agents'],
      url: 'https://github.com/alexnodeland/reflex',
      site: 'https://alexnodeland.github.io/reflex/',
      stars: 4,
      category: 'distributed-systems',
    },
    {
      name: 'qcsim',
      description:
        'a simple quantum circuit simulator in python — fundamental gates and circuit assembly on numpy.',
      language: 'Python',
      tags: ['experiment', 'quantum-computing', 'simulation'],
      url: 'https://github.com/alexnodeland/QCSim',
      stars: 1,
      category: 'distributed-systems',
    },

    // --- ai ---
    {
      name: 'principled',
      description:
        'claude code plugins for specification-first development: write the spec, then build to it.',
      language: 'Shell',
      tags: ['featured', 'tool', 'claude-code', 'spec-driven'],
      url: 'https://github.com/alexnodeland/principled',
      stars: 3,
      category: 'ai',
    },
    {
      name: 'curator',
      description:
        'a local search index over any markdown vault, served to agents over mcp, plus a digest of new notes ranked against your current interests.',
      language: 'Rust',
      tags: ['tool', 'mcp', 'local-first'],
      url: 'https://github.com/alexnodeland/curator',
      site: 'https://alexnodeland.github.io/curator/',
      stars: 1,
      category: 'ai',
    },
    {
      name: 'vanilla-react',
      description: 'dead simple react agent framework written in python.',
      language: 'Python',
      tags: ['library', 'agents', 'react-pattern'],
      url: 'https://github.com/alexnodeland/vanilla-react',
      stars: 8,
      category: 'ai',
    },
    {
      name: 'crewlit',
      description:
        'crewai in the browser: define agents, tasks, and crews in a streamlit ui instead of a python file.',
      language: 'Python',
      tags: ['app', 'multi-agent', 'streamlit'],
      url: 'https://github.com/alexnodeland/crewlit',
      stars: 26,
      category: 'ai',
    },
    {
      name: 'finance-crew',
      description:
        'a crewai system for market analysis: agents that pull data, propose a strategy, and assess its risk.',
      language: 'Python',
      tags: ['tool', 'multi-agent', 'finance'],
      url: 'https://github.com/alexnodeland/finance-crew',
      stars: 12,
      category: 'ai',
    },
    {
      name: 'resume-crew',
      description:
        'a crewai system that tailors a resume to a job posting and generates interview questions for it.',
      language: 'Python',
      tags: ['tool', 'multi-agent'],
      url: 'https://github.com/alexnodeland/resume-crew',
      stars: 9,
      category: 'ai',
    },

    // --- misc ---
    {
      name: 'md-share',
      description:
        'a markdown renderer that supports six dialects, has text-to-speech, and compresses the whole document into a shareable url. no backend.',
      language: 'TypeScript',
      tags: ['app', 'markdown', 'url-sharing'],
      url: 'https://github.com/alexnodeland/md-share',
      site: 'https://alexnodeland.github.io/md-share/',
      stars: 2,
      category: 'misc',
    },
    {
      name: 'curio-rss',
      description:
        'a local-first rss and read-later reader for macos that keeps everything in your notes as plain markdown. no telemetry.',
      language: 'Rust',
      tags: ['app', 'rss', 'local-first', 'macos'],
      url: 'https://github.com/alexnodeland/curio-rss',
      site: 'https://alexnodeland.github.io/curio-rss/',
      stars: 2,
      category: 'misc',
    },
    {
      name: 'tome',
      description:
        'an offline library for technical documentation: save any docs site, search it, and let your agent read it over mcp.',
      language: 'HTML',
      tags: ['app', 'documentation', 'local-first', 'mcp'],
      url: 'https://github.com/alexnodeland/tome',
      category: 'misc',
    },
    {
      name: 'no-doze',
      description:
        'a menu bar wrapper around caffeinate that keeps your mac awake.',
      language: 'Swift',
      tags: ['app', 'macos', 'menu-bar'],
      url: 'https://github.com/alexnodeland/no-doze',
      site: 'https://alexnodeland.github.io/no-doze/',
      stars: 1,
      category: 'misc',
    },
    {
      name: 'claude-telegram',
      description:
        'a telegram bridge to claude code, so you can drive it from your phone.',
      language: 'TypeScript',
      tags: ['tool', 'claude-code', 'telegram'],
      url: 'https://github.com/alexnodeland/claude-telegram',
      stars: 4,
      category: 'misc',
    },
    {
      name: 'statusbar',
      description:
        'swiftui menu bar app that monitors multiple status pages simultaneously.',
      language: 'Swift',
      tags: ['app', 'macos', 'menu-bar'],
      url: 'https://github.com/alexnodeland/StatusBar',
      site: 'https://alexnodeland.github.io/StatusBar/',
      stars: 2,
      category: 'misc',
    },
    {
      name: 'homebrew-tap',
      description: 'homebrew tap for alexnodeland projects.',
      language: 'Ruby',
      tags: ['tool', 'homebrew', 'packaging'],
      url: 'https://github.com/alexnodeland/homebrew-tap',
      stars: 1,
      category: 'misc',
    },
  ],
};

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
