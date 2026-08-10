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
      stars: 12,
      category: 'math',
    },
    {
      name: 'fugue-evo',
      description:
        'a probabilistic genetic algorithm library for rust — evolution as inference.',
      language: 'Rust',
      tags: ['library', 'evolutionary-algorithms', 'inference'],
      url: 'https://github.com/alexnodeland/fugue-evo',
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
      stars: 3,
      category: 'audio-dsp',
    },
    {
      name: 'auracle',
      description:
        'a synthesizer that searches for your sound — preference-learning evolutionary synthesis on fugue-evo and quiver.',
      language: 'Rust',
      tags: ['app', 'synthesis', 'preference-learning'],
      url: 'https://github.com/alexnodeland/auracle',
      stars: 1,
      category: 'audio-dsp',
    },
    {
      name: 'sleeve',
      description:
        'one long video in, a tagged album out — slices a recording into a properly tagged release.',
      language: 'Rust',
      tags: ['tool', 'cli', 'audio'],
      url: 'https://github.com/alexnodeland/sleeve',
      stars: 1,
      category: 'misc',
    },
    {
      name: 'llmcomposer',
      description:
        'compose music with an llm copilot — a research exploration of cross-modal musical understanding in language models.',
      language: 'Python',
      tags: ['experiment', 'music', 'llm'],
      url: 'https://github.com/alexnodeland/llmcomposer',
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
        'specification-driven development on human work platforms, powered by claude code.',
      language: 'Shell',
      tags: ['featured', 'tool', 'claude-code', 'spec-driven'],
      url: 'https://github.com/alexnodeland/principled',
      stars: 3,
      category: 'ai',
    },
    {
      name: 'curator',
      description:
        'local-first knowledge plane — any markdown vault, one embedded index, mcp for agents, and a deterministic librarian.',
      language: 'Rust',
      tags: ['tool', 'mcp', 'local-first'],
      url: 'https://github.com/alexnodeland/curator',
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
        'brings the power of crewai to your browser, making multi-agent ai systems accessible to everyone.',
      language: 'Python',
      tags: ['app', 'multi-agent', 'streamlit'],
      url: 'https://github.com/alexnodeland/crewlit',
      stars: 26,
      category: 'ai',
    },
    {
      name: 'finance-crew',
      description:
        'ai-powered market analysis, strategy development, and risk management for day traders, using crewai.',
      language: 'Python',
      tags: ['tool', 'multi-agent', 'finance'],
      url: 'https://github.com/alexnodeland/finance-crew',
      stars: 12,
      category: 'ai',
    },
    {
      name: 'resume-crew',
      description:
        'helps job seekers tailor their resumes and prepare for interviews, using crewai.',
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
        'a lightweight markdown renderer that speaks six dialects, reads itself aloud, and compresses your whole document into a shareable url. no backend.',
      language: 'TypeScript',
      tags: ['app', 'markdown', 'url-sharing'],
      url: 'https://github.com/alexnodeland/md-share',
      stars: 2,
      category: 'misc',
    },
    {
      name: 'curio-rss',
      description:
        'local-first macos rss & read-later reader that lives in your notes — plain-markdown export, no telemetry.',
      language: 'Rust',
      tags: ['app', 'rss', 'local-first', 'macos'],
      url: 'https://github.com/alexnodeland/curio-rss',
      stars: 2,
      category: 'misc',
    },
    {
      name: 'tome',
      description:
        'a personal library for technical documentation — read any docs site offline, search everything, let your agent read along over mcp.',
      language: 'HTML',
      tags: ['app', 'documentation', 'local-first', 'mcp'],
      url: 'https://github.com/alexnodeland/tome',
      category: 'misc',
    },
    {
      name: 'no-doze',
      description:
        'keep your mac awake from the menu bar — a free, open-source caffeinate wrapper with a 100%-tested core.',
      language: 'Swift',
      tags: ['app', 'macos', 'menu-bar'],
      url: 'https://github.com/alexnodeland/no-doze',
      stars: 1,
      category: 'misc',
    },
    {
      name: 'claude-telegram',
      description:
        'telegram-to-claude code bridge — control your codebase from your phone.',
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
