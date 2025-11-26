export interface GitHubProject {
  name: string;
  description: string;
  language: string;
  tags: string[];
  url: string;
  stars?: number;
  featured?: boolean;
}

export interface ProjectsConfig {
  title: string;
  subtitle: string;
  projects: GitHubProject[];
}

export const projectsConfig: ProjectsConfig = {
  title: 'projects',
  subtitle:
    'a collection of open source projects, experiments, and tools i\'ve built or contributed to.',
  projects: [
    {
      name: 'alexnodeland',
      description:
        'my personal website built with gatsby, featuring a retro-futuristic design, ai chat integration, and animated three.js backgrounds.',
      language: 'TypeScript',
      tags: ['gatsby', 'react', 'three.js', 'scss', 'personal-site'],
      url: 'https://github.com/alexnodeland/alexnodeland',
      featured: true,
    },
    {
      name: 'ai-engineering-hub',
      description:
        'curated collection of resources, patterns, and best practices for building production-ready ai systems and llm applications.',
      language: 'Python',
      tags: ['ai', 'llm', 'machine-learning', 'best-practices'],
      url: 'https://github.com/alexnodeland/ai-engineering-hub',
      featured: true,
    },
    {
      name: 'rag-patterns',
      description:
        'reference implementations and architectural patterns for retrieval-augmented generation systems.',
      language: 'Python',
      tags: ['rag', 'llm', 'vector-search', 'embeddings'],
      url: 'https://github.com/alexnodeland/rag-patterns',
      featured: true,
    },
    {
      name: 'workflow-orchestrator',
      description:
        'dag-based workflow orchestration framework for complex multi-step ai agent pipelines.',
      language: 'Python',
      tags: ['workflow', 'dag', 'orchestration', 'ai-agents'],
      url: 'https://github.com/alexnodeland/workflow-orchestrator',
    },
    {
      name: 'devops-templates',
      description:
        'collection of infrastructure as code templates for aws, docker, and kubernetes deployments.',
      language: 'HCL',
      tags: ['terraform', 'docker', 'kubernetes', 'aws', 'iac'],
      url: 'https://github.com/alexnodeland/devops-templates',
    },
    {
      name: 'signal-processing-toolkit',
      description:
        'numerical methods and algorithms for audio signal processing and compression.',
      language: 'Python',
      tags: ['dsp', 'audio', 'wavelets', 'compression'],
      url: 'https://github.com/alexnodeland/signal-processing-toolkit',
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
