// Project Categories
export type ProjectCategory =
  | 'library'
  | 'infrastructure'
  | 'application'
  | 'experiment'
  | 'tool'
  | 'fork'
  | 'research';

// Project Status
export type ProjectStatus = 'active' | 'stable' | 'archived';

// Link Types
export type ProjectLinkType =
  | 'github'
  | 'docs'
  | 'blog'
  | 'demo'
  | 'paper'
  | 'npm'
  | 'crates';

export interface ProjectLink {
  type: ProjectLinkType;
  url: string;
  label?: string;
}

export interface GitHubMetadata {
  repo: string; // "owner/repo" format
  stars?: number;
  lastCommit?: string;
}

export interface UpstreamInfo {
  name: string;
  url: string;
}

export interface Project {
  // Identity
  id: string;
  name: string;
  tagline: string;

  // Classification
  category: ProjectCategory;
  status: ProjectStatus;
  featured: boolean;

  // Content
  description: string;
  highlights?: string[];

  // Links
  links: ProjectLink[];

  // Metadata
  tags: string[];
  year?: number;

  // Fork-specific
  upstream?: UpstreamInfo;
  forkReason?: string;

  // GitHub metadata
  github?: GitHubMetadata;
}

export interface ProjectsConfig {
  title: string;
  subtitle: string;
  projects: Project[];
}

// Category display configuration
export const categoryConfig: Record<
  ProjectCategory,
  { label: string; color: string }
> = {
  library: { label: 'library', color: '#3178c6' }, // blue
  infrastructure: { label: 'infrastructure', color: '#9c27b0' }, // purple
  application: { label: 'application', color: '#00a854' }, // green
  experiment: { label: 'experiment', color: '#ff9800' }, // orange
  tool: { label: 'tool', color: '#6e7681' }, // gray
  fork: { label: 'fork', color: '#00acc1' }, // teal
  research: { label: 'research', color: '#5c6bc0' }, // indigo
};

// Status display configuration
export const statusConfig: Record<
  ProjectStatus,
  { label: string; color: string }
> = {
  active: { label: 'active', color: '#00a854' },
  stable: { label: 'stable', color: '#6e7681' },
  archived: { label: 'archived', color: '#9e9e9e' },
};

export const projectsConfig: ProjectsConfig = {
  title: 'projects',
  subtitle:
    'i build systems where elegant abstractions compose into complex behavior through well-governed local rules.',
  projects: [
    // Featured Projects
    {
      id: 'fugue',
      name: 'Fugue',
      tagline: 'monadic probabilistic programming for rust',
      category: 'library',
      status: 'active',
      featured: true,
      description: `
Fugue is a production-ready, monadic probabilistic programming library for Rust that enables expressive, type-safe probabilistic modeling.

## Architecture

The library uses a defunctionalized CPS monad implementation that enables composable probabilistic computations while maintaining Rust's safety guarantees.

## Inference Methods

- MCMC (Metropolis-Hastings, HMC)
- SMC (Sequential Monte Carlo)
- Variational Inference
- Approximate Bayesian Computation (ABC)

The design prioritizes ergonomics without sacrificing performance, making it suitable for both research prototyping and production deployment.
      `.trim(),
      highlights: [
        'Defunctionalized CPS monad implementation',
        'Type-safe probabilistic programming',
        'Multiple inference backends (MCMC, SMC, VI, ABC)',
      ],
      links: [
        { type: 'github', url: 'https://github.com/alexnodeland/fugue' },
        { type: 'crates', url: 'https://crates.io/crates/fugue' },
      ],
      tags: ['rust', 'probabilistic-programming', 'monads', 'mcmc', 'bayesian'],
      year: 2025,
      github: { repo: 'alexnodeland/fugue' },
    },
    {
      id: 'fugue-evo',
      name: 'Fugue-evo',
      tagline: 'evolutionary algorithms built on fugue primitives',
      category: 'library',
      status: 'active',
      featured: true,
      description: `
Fugue-evo extends the Fugue probabilistic programming library with evolutionary computation primitives.

## Features

- Genetic algorithms with configurable selection, crossover, and mutation operators
- Evolution strategies (CMA-ES, Natural Evolution Strategies)
- Multi-objective optimization (NSGA-II, MOEA/D)
- Seamless integration with Fugue's probabilistic primitives

Built on the same compositional philosophy as Fugue, enabling hybrid probabilistic-evolutionary approaches.
      `.trim(),
      highlights: [
        'Genetic algorithms with pluggable operators',
        'Evolution strategies (CMA-ES, NES)',
        'Multi-objective optimization support',
      ],
      links: [
        { type: 'github', url: 'https://github.com/alexnodeland/fugue-evo' },
      ],
      tags: ['rust', 'evolutionary-algorithms', 'optimization', 'genetic-algorithms'],
      year: 2025,
      github: { repo: 'alexnodeland/fugue-evo' },
    },
    {
      id: 'quiver',
      name: 'Quiver',
      tagline: 'composable agent framework for llm orchestration',
      category: 'library',
      status: 'active',
      featured: true,
      description: `
Quiver is a composable agent framework designed for building complex LLM-powered systems through simple, well-defined primitives.

## Design Philosophy

Rather than providing a monolithic agent architecture, Quiver offers building blocks that compose naturally:

- **Arrows**: Typed, composable computation units
- **Contexts**: Scoped state and capability management
- **Flows**: DAG-based workflow orchestration

## Key Features

- Type-safe agent composition
- Built-in observability and tracing
- Flexible tool integration
- Support for multi-agent coordination
      `.trim(),
      highlights: [
        'Arrow-based composable computation model',
        'DAG workflow orchestration',
        'Type-safe agent composition',
      ],
      links: [
        { type: 'github', url: 'https://github.com/alexnodeland/quiver' },
      ],
      tags: ['python', 'llm', 'agents', 'orchestration', 'composition'],
      year: 2025,
      github: { repo: 'alexnodeland/quiver' },
    },
    {
      id: 'principled',
      name: 'Principled',
      tagline: 'opinionated project templates for structured development',
      category: 'infrastructure',
      status: 'active',
      featured: true,
      description: `
Principled provides opinionated project templates that encode best practices for structured software development.

## Available Templates

- **Python**: Poetry-based setup with pytest, mypy, ruff, pre-commit hooks
- **Rust**: Cargo workspace with clippy, rustfmt, CI/CD
- **TypeScript**: pnpm monorepo with ESLint, Prettier, Vitest

## Philosophy

Each template embodies the principle that good defaults and clear conventions reduce cognitive load and enable faster iteration without sacrificing quality.
      `.trim(),
      highlights: [
        'Battle-tested project templates',
        'Integrated CI/CD configurations',
        'Pre-configured linting and formatting',
      ],
      links: [
        { type: 'github', url: 'https://github.com/alexnodeland/principled' },
      ],
      tags: ['templates', 'devops', 'python', 'rust', 'typescript', 'ci-cd'],
      year: 2025,
      github: { repo: 'alexnodeland/principled' },
    },
    {
      id: 'artifactr',
      name: 'Artifactr',
      tagline: 'artifact management for ml experiments and pipelines',
      category: 'infrastructure',
      status: 'active',
      featured: true,
      description: `
Artifactr provides a unified interface for managing artifacts across ML experiments and data pipelines.

## Features

- **Versioned artifacts**: Track models, datasets, and intermediate results
- **Storage backends**: S3, GCS, local filesystem, with pluggable backends
- **Lineage tracking**: Automatic provenance for reproducibility
- **Integration**: Works with MLflow, Weights & Biases, or standalone

## Design Goals

Minimize boilerplate while maintaining full control over artifact lifecycle and storage strategy.
      `.trim(),
      highlights: [
        'Unified artifact versioning and tracking',
        'Pluggable storage backends',
        'Automatic lineage and provenance',
      ],
      links: [
        { type: 'github', url: 'https://github.com/alexnodeland/artifactr' },
      ],
      tags: ['python', 'mlops', 'artifacts', 'ml-pipelines', 'data-engineering'],
      year: 2025,
      github: { repo: 'alexnodeland/artifactr' },
    },

    // Experiments
    {
      id: 'finance-crew',
      name: 'Finance Crew',
      tagline: 'multi-agent financial analysis with crewai',
      category: 'experiment',
      status: 'archived',
      featured: false,
      description: `
An experimental multi-agent system for financial analysis built with CrewAI.

Demonstrates coordinated agents performing market research, fundamental analysis, and report generation. Served as a learning exercise for multi-agent orchestration patterns.
      `.trim(),
      highlights: [
        'Multi-agent coordination patterns',
        'Financial data integration',
        'Automated report generation',
      ],
      links: [
        { type: 'github', url: 'https://github.com/alexnodeland/finance-crew' },
        { type: 'blog', url: '/blog/finance-crew' },
      ],
      tags: ['python', 'crewai', 'agents', 'finance', 'llm'],
      year: 2024,
      github: { repo: 'alexnodeland/finance-crew' },
    },
    {
      id: 'crewlit',
      name: 'Crewlit',
      tagline: 'literature review automation with agent crews',
      category: 'experiment',
      status: 'archived',
      featured: false,
      description: `
Automated literature review system using multi-agent collaboration.

Agents coordinate to search papers, extract key findings, identify themes, and synthesize summaries. An exploration of agent-based knowledge work automation.
      `.trim(),
      highlights: [
        'Paper search and retrieval agents',
        'Automated theme extraction',
        'Synthesis and summarization',
      ],
      links: [
        { type: 'github', url: 'https://github.com/alexnodeland/crewlit' },
        { type: 'blog', url: '/blog/crewlit' },
      ],
      tags: ['python', 'crewai', 'agents', 'research', 'literature-review'],
      year: 2024,
      github: { repo: 'alexnodeland/crewlit' },
    },
    {
      id: 'resume-crew',
      name: 'Resume Crew',
      tagline: 'ai-powered resume tailoring with agent collaboration',
      category: 'experiment',
      status: 'archived',
      featured: false,
      description: `
Multi-agent system for tailoring resumes to job descriptions.

Agents analyze job postings, identify relevant experience, and suggest resume modifications. A practical exploration of agent coordination for document generation tasks.
      `.trim(),
      links: [
        { type: 'github', url: 'https://github.com/alexnodeland/resume-crew' },
        { type: 'blog', url: '/blog/resume-crew' },
      ],
      tags: ['python', 'crewai', 'agents', 'resume', 'nlp'],
      year: 2024,
      github: { repo: 'alexnodeland/resume-crew' },
    },
    {
      id: 'vanilla-react',
      name: 'Vanilla ReAct',
      tagline: 'minimal react agent implementation from scratch',
      category: 'experiment',
      status: 'archived',
      featured: false,
      description: `
A minimal implementation of the ReAct (Reasoning + Acting) agent pattern without external frameworks.

Built to understand the core mechanics of tool-using agents: thought generation, action selection, observation processing, and iterative refinement.
      `.trim(),
      highlights: [
        'Pure Python implementation',
        'Clear ReAct loop mechanics',
        'Educational codebase',
      ],
      links: [
        { type: 'github', url: 'https://github.com/alexnodeland/vanilla-react' },
        { type: 'blog', url: '/blog/vanilla-react' },
      ],
      tags: ['python', 'agents', 'react', 'llm', 'from-scratch'],
      year: 2024,
      github: { repo: 'alexnodeland/vanilla-react' },
    },
    {
      id: 'qcsim',
      name: 'QCSim',
      tagline: 'quantum circuit simulator for learning and exploration',
      category: 'experiment',
      status: 'archived',
      featured: false,
      description: `
A simple quantum circuit simulator built for learning quantum computing fundamentals.

Implements basic gates, state vectors, and measurement. Useful for understanding quantum mechanics without the complexity of production simulators.
      `.trim(),
      highlights: [
        'Basic quantum gate implementations',
        'State vector simulation',
        'Educational quantum computing',
      ],
      links: [
        { type: 'github', url: 'https://github.com/alexnodeland/qcsim' },
        { type: 'blog', url: '/blog/qcsim' },
      ],
      tags: ['python', 'quantum-computing', 'simulation', 'education'],
      year: 2024,
      github: { repo: 'alexnodeland/qcsim' },
    },
    {
      id: 'algorithm-visualizations',
      name: 'Algorithm Visualizations',
      tagline: 'interactive visualizations of classic algorithms',
      category: 'experiment',
      status: 'stable',
      featured: false,
      description: `
A collection of interactive algorithm visualizations for educational purposes.

Covers sorting algorithms, graph traversals, dynamic programming, and more. Built with vanilla JavaScript and Canvas for accessibility and simplicity.
      `.trim(),
      links: [{ type: 'blog', url: '/blog/algorithm-visualizations' }],
      tags: ['javascript', 'algorithms', 'visualization', 'education'],
      year: 2023,
    },

    // Research
    {
      id: 'wavelet-research',
      name: 'Wavelet Audio Compression',
      tagline: 'research on optimal wavelet bases for audio signals',
      category: 'research',
      status: 'archived',
      featured: false,
      description: `
Graduate research on optimal wavelet bases for audio compression conducted at Stony Brook University.

Investigated the trade-offs between different wavelet families for audio signal representation, focusing on perceptual quality metrics and compression ratios.
      `.trim(),
      highlights: [
        'Wavelet basis optimization for audio',
        'Perceptual quality metrics',
        'High-performance computing implementation',
      ],
      links: [{ type: 'blog', url: '/blog/wavelet-research' }],
      tags: [
        'signal-processing',
        'wavelets',
        'audio',
        'compression',
        'research',
      ],
      year: 2017,
    },

    // Personal site
    {
      id: 'alexnodeland',
      name: 'alexnodeland.com',
      tagline: 'personal website with retro-futuristic design',
      category: 'application',
      status: 'active',
      featured: false,
      description: `
My personal website built with Gatsby, featuring a retro-futuristic design aesthetic.

Includes an AI chat integration, animated Three.js backgrounds, and a comprehensive CV section with export capabilities.
      `.trim(),
      highlights: [
        'Gatsby + React + TypeScript',
        'Three.js animated backgrounds',
        'AI chat integration',
      ],
      links: [
        { type: 'github', url: 'https://github.com/alexnodeland/alexnodeland' },
        { type: 'demo', url: 'https://alexnodeland.com' },
      ],
      tags: ['gatsby', 'react', 'typescript', 'three.js', 'scss'],
      year: 2024,
      github: { repo: 'alexnodeland/alexnodeland' },
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

// Helper to get all unique categories from projects
export const getProjectCategories = (): ProjectCategory[] => {
  const categories = new Set<ProjectCategory>();
  projectsConfig.projects.forEach(p => categories.add(p.category));
  return Array.from(categories);
};

// Helper to get all unique statuses from projects
export const getProjectStatuses = (): ProjectStatus[] => {
  const statuses = new Set<ProjectStatus>();
  projectsConfig.projects.forEach(p => statuses.add(p.status));
  return Array.from(statuses);
};
