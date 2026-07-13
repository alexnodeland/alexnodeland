export type ProjectCategory = 'apps' | 'tools' | 'libraries' | 'experiments';

export interface GitHubProject {
  name: string;
  description: string;
  language: string;
  tags: string[];
  url: string;
  stars?: number;
  featured?: boolean;
  category?: ProjectCategory;
}

export interface ProjectsConfig {
  title: string;
  subtitle: string;
  categories: { id: ProjectCategory; title: string }[];
  projects: GitHubProject[];
}

export const projectsConfig: ProjectsConfig = {
  title: 'projects',
  subtitle:
    "a collection of open source projects, experiments, and tools i've built or contributed to.",
  categories: [
    { id: 'apps', title: 'apps' },
    { id: 'tools', title: 'tools' },
    { id: 'libraries', title: 'libraries' },
    { id: 'experiments', title: 'experiments' },
  ],
  projects: [
    // --- featured ---
    {
      name: 'fugue',
      description:
        'a type-safe, monadic probabilistic programming library for rust.',
      language: 'Rust',
      tags: ['bayesian', 'monads', 'ppl', 'probabilistic-programming'],
      url: 'https://github.com/alexnodeland/fugue',
      stars: 12,
      featured: true,
    },
    {
      name: 'quiver',
      description:
        'a modular audio synthesis library using arrow-style combinators and graph-based patching.',
      language: 'Rust',
      tags: ['category-theory', 'dsp', 'modular-synthesizers'],
      url: 'https://github.com/alexnodeland/quiver',
      stars: 3,
      featured: true,
    },
    {
      name: 'principled',
      description:
        'specification-driven development on human work platforms, powered by claude code.',
      language: 'Shell',
      tags: ['claude-code', 'spec-driven', 'workflow'],
      url: 'https://github.com/alexnodeland/principled',
      stars: 3,
      featured: true,
    },
    // --- apps ---
    {
      name: 'curio-rss',
      description:
        'local-first macos rss & read-later reader that lives in your notes — plain-markdown export, no telemetry.',
      language: 'Rust',
      tags: ['rss', 'local-first', 'macos', 'tauri'],
      url: 'https://github.com/alexnodeland/curio-rss',
      stars: 2,
      category: 'apps',
    },
    {
      name: 'md-share',
      description:
        'a lightweight markdown renderer that speaks six dialects, reads itself aloud, and compresses your whole document into a shareable url. no backend.',
      language: 'TypeScript',
      tags: ['markdown', 'renderer', 'url-sharing'],
      url: 'https://github.com/alexnodeland/md-share',
      stars: 2,
      category: 'apps',
    },
    {
      name: 'StatusBar',
      description:
        'swiftui menu bar app that monitors multiple status pages simultaneously.',
      language: 'Swift',
      tags: ['swiftui', 'menu-bar', 'status-monitoring'],
      url: 'https://github.com/alexnodeland/StatusBar',
      stars: 2,
      category: 'apps',
    },
    {
      name: 'no-doze',
      description:
        'keep your mac awake from the menu bar — a free, open-source caffeinate wrapper with a 100%-tested core.',
      language: 'Swift',
      tags: ['macos', 'menu-bar', 'caffeinate'],
      url: 'https://github.com/alexnodeland/no-doze',
      stars: 1,
      category: 'apps',
    },
    // --- tools ---
    {
      name: 'claude-telegram',
      description:
        'telegram-to-claude code bridge — control your codebase from your phone.',
      language: 'TypeScript',
      tags: ['ai-agent', 'claude-code', 'mcp', 'telegram'],
      url: 'https://github.com/alexnodeland/claude-telegram',
      stars: 4,
      category: 'tools',
    },
    {
      name: 'obsidian-github-projects',
      description:
        'manage github projects v2 with kanban boards directly in obsidian.',
      language: 'TypeScript',
      tags: ['obsidian', 'github', 'kanban', 'productivity'],
      url: 'https://github.com/alexnodeland/obsidian-github-projects',
      stars: 5,
      category: 'tools',
    },
    {
      name: 'fugue-evo',
      description: 'a probabilistic genetic algorithm library for rust.',
      language: 'Rust',
      tags: ['genetic-algorithms', 'probabilistic', 'rust'],
      url: 'https://github.com/alexnodeland/fugue-evo',
      stars: 2,
      featured: true,
    },
    // --- libraries ---
    {
      name: 'artifactr',
      description:
        'a template backend for collaborating on artifacts with agents.',
      language: 'Python',
      tags: ['agents', 'fastapi', 'pydantic-ai', 'template'],
      url: 'https://github.com/alexnodeland/artifactr',
      category: 'libraries',
    },
    {
      name: 'reflex',
      description: 'real-time ai agent template project.',
      language: 'Python',
      tags: ['ai-agent', 'real-time', 'template'],
      url: 'https://github.com/alexnodeland/reflex',
      stars: 4,
      category: 'libraries',
    },
    // --- experiments ---
    {
      name: 'crewlit',
      description:
        'crewlit brings the power of crewai to your browser, making multi-agent ai systems accessible to everyone.',
      language: 'Python',
      tags: [
        'llm',
        'multi-agent-systems',
        'retrieval-augmented-generation',
        'webapp',
      ],
      url: 'https://github.com/alexnodeland/crewlit',
      stars: 26,
      category: 'experiments',
    },
    {
      name: 'finance-crew',
      description:
        'an ai-powered tool that helps day traders analyze markets, develop strategies, and manage risks using crewai.',
      language: 'Python',
      tags: ['ai', 'trading', 'crewai', 'agents'],
      url: 'https://github.com/alexnodeland/finance-crew',
      stars: 12,
      category: 'experiments',
    },
    {
      name: 'resume-crew',
      description:
        'an ai-powered tool that helps job seekers tailor their resumes and prepare for interviews using crewai.',
      language: 'Python',
      tags: ['ai', 'resume', 'crewai', 'career'],
      url: 'https://github.com/alexnodeland/resume-crew',
      stars: 9,
      category: 'experiments',
    },
    {
      name: 'vanilla-react',
      description: 'dead simple react agent framework written in python.',
      language: 'Python',
      tags: ['agents', 'llm', 'openai-api'],
      url: 'https://github.com/alexnodeland/vanilla-react',
      stars: 8,
      category: 'experiments',
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
  };

  return colors[language] || '#6e7681';
};
