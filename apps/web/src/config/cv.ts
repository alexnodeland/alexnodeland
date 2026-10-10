import cvPagesJson from './cv-pages.json';
import { projectsConfig } from './projects';

/**
 * A role variant: one of the focused one-pagers, each with a page of its own.
 *
 * The list of them is `cv-pages.json` — each key a variant, each entry its
 * page's path, menu label, hero tagline and tab title — and it is the one
 * place a variant is declared. `gatsby-node.js` creates a page per entry from
 * `src/templates/cv-variant.tsx`; the heroes, the sitemap exclusions, the
 * document menu and its routes all read the same entries. Adding a key there
 * is how a variant is added, and the types below then ask this file for the
 * rest: its PDF artifact, its audience, and whatever content it selects.
 */
export type RoleVariant = keyof typeof cvPagesJson;

export interface CVPage {
  path: string;
  label: string;
  tagline: string;
  title: string;
  description: string;
}

export const CV_PAGES: Record<RoleVariant, CVPage> = cvPagesJson;

/**
 * Which document is being produced: the complete CV, the neutral one-pager,
 * or one of the role variants in `cv-pages.json`.
 */
export type CVVariant = 'full' | 'resume' | RoleVariant;

/** Whether a variant is one of the role variants, with a generated page. */
export const isRoleVariant = (variant: string): variant is RoleVariant =>
  Object.prototype.hasOwnProperty.call(CV_PAGES, variant);

/**
 * Who a bullet is written for.
 *
 * A bullet carrying a tag is offered to the variants that share it and
 * withheld from the ones that do not — so `exec` bullets (fundraising, board,
 * investor relations) stay off the engineering-focused pages, which keeps
 * those pages about the engineering. A bullet with no tags at all
 * is neutral and eligible everywhere.
 */
export type AudienceTag = 'fde' | 'ai-eng' | 'music' | 'exec' | 'hardware';

/**
 * How a role was held. Rendered beside the dates so overlapping entries read
 * as concurrent commitments rather than as job-hopping.
 */
export type EngagementType =
  'full-time' | 'part-time' | 'advisory' | 'freelance' | 'contract';

/**
 * An achievement, either as bare prose or with the metadata the generator
 * selects on. Bare strings stay bare: only bullets that actually need a tag or
 * a metric pay for the object form, which keeps this file readable.
 */
export type Bullet =
  | string
  | {
      text: string;
      /** Audiences this bullet is for. Omit to leave it neutral. */
      tags?: AudienceTag[];
      /**
       * Show this bullet only to the audiences in `tags`. A tagged bullet is
       * otherwise still part of the record — the full CV carries it and the
       * neutral one-pager may — which is right for a bullet written *for*
       * an audience, and wrong for one that is only *about* it: the music
       * detail that belongs on the music-tech page and would dilute every
       * general document. Requires `tags`.
       */
      audienceOnly?: boolean;
      /**
       * The figure this bullet carries, repeated here so the generator can
       * prefer it when trimming to a page. The number must also appear in
       * `text` — this field ranks, it does not render.
       */
      metric?: string;
    };

/**
 * A keyword on the skills line. The object form carries the same audience
 * fields as a bullet, with the same meaning: `tags` offers it to those
 * variants, and `audienceOnly` keeps it off every document that selects no
 * audience — the full CV and the neutral one-pager.
 */
export type Skill =
  string | { name: string; tags?: AudienceTag[]; audienceOnly?: boolean };

/** A labelled run of the skills line, as the one-pagers set it. */
export interface SkillGroup {
  label: string;
  items: string[];
}

/**
 * The groups the skills line is set in, in order, each naming the terms it
 * holds. Infra is the catch-all: a term in `technical` that no group
 * names lands there, so a new skill is never dropped.
 */
export const SKILL_GROUPS: { label: string; names: string[] }[] = [
  {
    label: 'Core',
    names: [
      'Python',
      'C++',
      'SQL',
      'Mathematics',
      'TypeScript and Rust (working knowledge)',
    ],
  },
  {
    label: 'Python',
    names: [
      'FastAPI',
      'Pydantic',
      'SQLAlchemy',
      'Alembic',
      'asyncio',
      'Polars',
      'pytest',
    ],
  },
  {
    label: 'AI',
    names: [
      'LLMs',
      'Agents',
      'Agent Memory',
      'Context Engineering',
      'Harness Engineering',
      'Evals',
      'LLM-as-judge',
      'Guardrails',
      'RAG',
    ],
  },
  {
    label: 'LLM tools',
    names: [
      'Anthropic and OpenAI APIs',
      'MCP',
      'PydanticAI',
      'LangGraph',
      'DSPy',
      'LiteLLM',
      'Langfuse',
      'Claude Code',
    ],
  },
  {
    label: 'Audio',
    names: [
      'Signal Processing',
      'Audio Synthesis',
      'Audio Compression',
      'Real-time Audio',
    ],
  },
  {
    label: 'Data',
    names: [
      'PostgreSQL',
      'pgvector',
      'Redis',
      'OpenSearch',
      'Vector Search',
      'Knowledge Graphs',
      'Semantic Layers',
      'Data Engineering',
    ],
  },
  { label: 'Infra', names: [] },
  {
    label: 'Delivery',
    names: ['Solution Architecture', 'Technical Pre-Sales'],
  },
];

/** Splits a variant's skills line into `SKILL_GROUPS`, dropping empty groups. */
export const groupSkills = (skills: string[]): SkillGroup[] => {
  const fallback = SKILL_GROUPS.findIndex(g => g.label === 'Infra');
  const groups = SKILL_GROUPS.map(({ label }) => ({
    label,
    items: [] as string[],
  }));
  for (const skill of skills) {
    const index = SKILL_GROUPS.findIndex(group => group.names.includes(skill));
    groups[index === -1 ? fallback : index].items.push(skill);
  }
  return groups.filter(group => group.items.length > 0);
};

/** How one role is cut down for one variant. */
export interface RoleVariantRule {
  maxBullets: number;
  /**
   * Cut the role to a single bullet, whatever `maxBullets` says — what the
   * long-running freelance entry wants on a page that needs the room for
   * current work.
   *
   * One bullet rather than none. An entry line with nothing under it leaves two
   * entry lines back to back, and a parser that splits jobs on the gap between
   * them cannot see the boundary: OpenResume merged the role below into this
   * one and dropped it, on a page where every line of the text layer was
   * correct. A single line under the title restores the rhythm and still saves
   * most of the space.
   */
  collapse?: boolean;
}

/** A role as authored. `buildVariant` resolves it into an `ExperienceItem`. */
export interface ExperienceSource {
  title: string;
  company: string;
  location: string;
  duration: string;
  description?: string;
  engagement?: EngagementType;
  /** Ordered strongest-first; a variant takes the top `maxBullets` after filtering. */
  achievements: Bullet[];
  skills?: string[];
  /**
   * Per-variant inclusion. A variant missing from this map leaves the role off
   * that document entirely; the full CV always carries every role.
   */
  variants?: Partial<Record<Exclude<CVVariant, 'full'>, RoleVariantRule>>;
}

/** A role as rendered — what the page, the exporters and the templates consume. */
export interface ExperienceItem {
  title: string;
  company: string;
  location: string;
  duration: string;
  description?: string;
  engagement?: EngagementType;
  achievements: string[];
  skills?: string[];
  highlights?: string[];
  /** Set when the role is rendered as a single line rather than a bulleted entry. */
  collapsed?: boolean;
}

export interface EducationItem {
  degree: string;
  institution: string;
  location: string;
  duration: string;
  gpa?: string;
  relevantCoursework?: string[];
  achievements?: string[];
  description?: string;
}

export interface CertificationItem {
  name: string;
  issuer: string;
  date: string;
  credentialId?: string;
  url?: string;
}

export interface ProjectItem {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
  github?: string;
  highlights?: string[];
}

export interface CVData {
  personal: {
    name: string;
    title: string;
    email: string;
    phone?: string;
    location: string;
    website: string;
    /** Bare host and path, as printed: `linkedin.com/in/...`. */
    linkedin?: string;
    /** Bare host and path, as printed: `github.com/...`. */
    github?: string;
    summary: string;
  };

  experience: ExperienceItem[];
  education: EducationItem[];
  certifications: CertificationItem[];
  projects?: ProjectItem[];
  skills: {
    technical: string[];
    /** `technical`, split into `SKILL_GROUPS` for the typeset documents. */
    groups?: SkillGroup[];
    soft?: string[];
    languages?: string[];
  };

  // Optional sections
  publications?: Array<{
    title: string;
    authors: string;
    journal: string;
    year: string;
    url?: string;
  }>;

  awards?: Array<{
    name: string;
    issuer: string;
    date: string;
    description?: string;
  }>;
}

/**
 * The CV as authored — the single source of truth. Everything the site and the
 * typesetter consume is a `CVData` resolved out of this by `buildVariant`, so
 * a fact is written down exactly once and each document decides how much of it
 * to show.
 */
export interface CVSource extends Omit<
  CVData,
  'personal' | 'experience' | 'skills' | 'projects'
> {
  personal: CVData['personal'] & {
    /** Summary written for one audience. Falls back to `summary`. */
    summaryByVariant?: Partial<Record<Exclude<CVVariant, 'full'>, string>>;
    /** Headline written for one audience. Falls back to `title`. */
    titleByVariant?: Partial<Record<Exclude<CVVariant, 'full'>, string>>;
  };
  experience: ExperienceSource[];
  skills: {
    /**
     * The one list every document's skills line is selected from, in the
     * order it is authored. Tag a term to offer it to a variant; mark it
     * `audienceOnly` to keep it off the general documents too. There is no
     * per-variant list: the order here is the order on every page, so a
     * term that should lead is authored early.
     */
    technical: Skill[];
    soft?: string[];
    languages?: string[];
  };
  /**
   * Which projects each document carries, named by their `name` in
   * `src/config/projects.ts` so the descriptions and links are not restated
   * here. A variant with no entry gets no Projects section.
   */
  projects?: Partial<Record<CVVariant, string[]>>;
}

export const cvSource: CVSource = {
  personal: {
    name: 'Alex Nodeland',
    title: 'Senior AI Engineer',
    email: 'alex@ournature.studio',
    location: 'Stamford, NY',
    website: 'alexnodeland.com',
    linkedin: 'linkedin.com/in/alexnodeland',
    github: 'github.com/alexnodeland',
    summary:
      'Engineer and mathematician with 10+ years shipping software, now building AI systems at Perch Insights: agent harnesses, evaluation infrastructure, and the memory and semantic layer they run on. Previously co-founded and ran a supercomputing startup in Singapore for four years, growing it to 15 people, led engineering at a music-ML company later acquired by SoundCloud, and researched audio compression on HPC clusters at Stony Brook.',
    summaryByVariant: {
      // Leads with the delivery work: systems that hold up in front of customers.
      fde: 'Engineer who takes LLM systems from a prototype to something that holds up in front of customers. At Perch Insights I built the agent harness behind an analytics product that cut analysis time by about 80%, and the agent that turns requests into scheduled business reviews sent to clients. Before that I co-founded a supercomputing startup in Singapore, took it from founding to launch in 14 months, and led engineering at a music-ML company SoundCloud acquired.',
      // Leads with shipped systems and names them concretely. The founder
      // years are one clause: enough to account for the time, while the page
      // stays about the systems.
      'ai-engineer':
        'AI engineer building production LLM systems: agent harnesses, evaluation infrastructure, and agent memory. At Perch Insights I built the agent harness behind the product (6 subagents, 50 tools), 1,000+ eval cases, and an agent memory architecture spanning episodic, semantic, and procedural memory. Earlier I built hybrid semantic and graph retrieval at Influize, co-founded a supercomputing startup, and researched audio compression on HPC clusters at Stony Brook.',
      // Audio at every layer, oldest work included: this is the one page
      // where the pedal firmware and the wavelet research lead rather than
      // trail, and the Rust libraries are the current work rather than a
      // weekend note.
      'music-tech':
        'Engineer and mathematician who has worked on audio at every layer: firmware for digital guitar pedals, wavelet research on audio compression, synthesizer design at Stony Brook, and engineering leadership at Musiio, a music-ML company SoundCloud acquired. I maintain quiver, a modular audio synthesis library in Rust, and auracle, a synthesizer that evolves patches toward the ones you prefer. Today I work on AI systems at Perch Insights: agent harnesses, evaluation infrastructure, and the memory and semantic layer they run on.',
    },
  },

  experience: [
    {
      title: 'Senior AI Engineer',
      company: 'Perch Insights',
      engagement: 'full-time',
      // The most relevant role on every page, and the one the AI Engineer
      // variant spends most of its room on.
      variants: {
        resume: { maxBullets: 3 },
        fde: { maxBullets: 3 },
        'ai-engineer': { maxBullets: 4 },
        'music-tech': { maxBullets: 1 },
      },
      location: 'Remote, NY',
      duration: '2024 - Present',
      achievements: [
        // Approximate on purpose: the exact counts are not disclosable.
        {
          text: 'Lead AI engineering for the analytics product, cutting analysis time by about 80% across the BI analyst team',
          tags: ['fde', 'ai-eng'],
          metric: '80%',
        },
        // Replaced the earlier DAG framework and workflow DSL, both retired.
        {
          text: "Designed and built the product's agent harness: 6 subagents and 50 tools, with reusable and scheduled workflows",
          tags: ['fde', 'ai-eng', 'music'],
          metric: '6 subagents, 50 tools',
        },
        {
          text: 'Built 1,000+ eval cases across subagents, tool use, end-to-end task completion, and guardrails',
          tags: ['ai-eng'],
          metric: '1,000+',
        },
        {
          text: "Designed the agents' memory architecture (episodic, semantic, and procedural), unifying the semantic layer and workflows",
          tags: ['ai-eng'],
        },
        {
          text: 'Built the agent that turns requests into scheduled workflows producing the weekly and monthly reviews sent to clients',
          tags: ['fde', 'ai-eng'],
        },
        {
          text: 'Built an internal portal for monitoring, debugging, and managing agent runs',
          tags: ['ai-eng'],
        },
        'Extended the semantic data model with ontological abstractions and business concepts that root-cause analysis and data discovery are built on, and prototyped the internal tool for managing it',
        {
          text: 'Wrote tabular insight agents on Jinja templates with full lineage and provenance, so every generated number can be traced back to its source',
          tags: ['ai-eng'],
        },
        'Ran a fault-tolerant distributed worker fleet on AWS (ECS/SNS/SQS) with dead-letter queue handling and zero-downtime deploys',
        'Built a suite of agentic coding plugins for the engineering team',
      ],
      skills: [
        'Python',
        'AWS',
        'Docker',
        'Container Orchestration',
        'Machine Learning',
        'LLMs',
        'Data Engineering',
      ],
    },
    {
      title: 'Head of AI',
      company: 'Influize',
      engagement: 'full-time',
      variants: {
        resume: { maxBullets: 3 },
        fde: { maxBullets: 3 },
        'ai-engineer': { maxBullets: 3 },
      },
      location: 'Remote, NY',
      duration: '2023 - 2024',
      achievements: [
        {
          text: 'Owned AI and backend engineering, taking the product from prototype to production in 2 months',
          tags: ['fde', 'ai-eng'],
          metric: '2 months',
        },
        {
          text: "Built hybrid semantic and graph retrieval to ground personalized, on-brand content in each customer's data",
          tags: ['fde', 'ai-eng'],
        },
        {
          text: 'Built the platform the AI ran on (API, data model, auth), and onboarded an engineer onto DevOps and AWS infrastructure',
          tags: ['fde', 'ai-eng'],
        },
        {
          text: 'Added monitoring across the AI pipelines to catch quality regressions',
          tags: ['ai-eng'],
        },
        'Built ontological models to give the data model a consistent vocabulary',
        {
          text: 'Coordinated with external development teams on platform integration',
          tags: ['fde'],
        },
      ],
      skills: [
        'Python',
        'PostgreSQL',
        'Supabase',
        'AWS',
        'RAG',
        'LLMs',
        'Infrastructure as Code',
      ],
    },
    {
      title: 'Technical Strategy Consultant',
      company: 'Freelance',
      engagement: 'freelance',
      // Client-facing scoping work, which is the FDE story — so that page
      // keeps the bullets. The AI Engineer page collapses it to one line: it
      // still accounts for the time, without spending six lines on advisory
      // work next to the systems it wants to lead with.
      variants: {
        resume: { maxBullets: 2 },
        fde: { maxBullets: 2 },
        'ai-engineer': { maxBullets: 1, collapse: true },
        'music-tech': { maxBullets: 1, collapse: true },
      },
      location: 'Remote, NY',
      duration: '2022 - Present',
      achievements: [
        // Leads the entry: of everything here, this is the AI system actually
        // built, and the one line the AI Engineer page keeps when it collapses.
        // Tagged for music too: it is the line that page keeps when the entry
        // collapses, in place of the keynote.
        {
          text: 'Built a knowledge-graph AI copilot over thousands of documents for a consulting firm: a graph UI, chatbot, and Claude Code plugin that query it live and write reports and decks',
          tags: ['fde', 'ai-eng', 'music'],
          metric: 'thousands of documents',
        },
        {
          text: 'Advise startups and established companies on AI strategy: technology assessments, build-versus-buy, and stack choices',
          tags: ['fde'],
        },
        'Delivered a virtual keynote to about 30 CIOs and founders, hosted by an Australian VC, on LLM architectures, guardrails for workflows, and feedback loops that let an organization build on automation',
        {
          text: 'Codified organizational process for a blockchain unicorn: RACI matrices, documented processes, and access controls aligned across the org and built into internal tooling',
          tags: ['fde'],
        },
        'Led migrations onto AI-integrated systems that reduced cost and manual work',
        'Developed personal knowledge management agents in Claude Code and Obsidian for non-technical founders, consultants, and creatives, covering capture, linking, reviews, and research across their notes',
      ],
      skills: [
        'Strategic Planning',
        'AI Consulting',
        'Technology Assessment',
        'Business Development',
      ],
    },
    {
      title: 'Tech Lead',
      company: 'Musiio (acquired by SoundCloud)',
      engagement: 'contract',
      variants: {
        resume: { maxBullets: 2 },
        fde: { maxBullets: 2 },
        'ai-engineer': { maxBullets: 2 },
        'music-tech': { maxBullets: 3 },
      },
      location: 'Singapore, SG',
      duration: '2021 - 2022',
      achievements: [
        // Tagged for every audience, so the team leads the entry everywhere.
        {
          text: 'Led a team of 5 to 10 engineers, working with the music, research, and sales teams',
          tags: ['fde', 'ai-eng', 'music'],
          metric: '5 to 10',
        },
        // The AI Engineer page's second line: the engineering under the models.
        {
          text: 'Built catalogue-scale audio ingestion pipelines, and designed the model validation process with the music team',
          tags: ['ai-eng'],
          audienceOnly: true,
        },
        {
          text: 'Planned the roadmap and releases with the founders around customer and partner needs',
          tags: ['fde'],
        },
        // The music work, shown to that audience only.
        {
          text: "Built the pipelines that ingested labels' and publishers' catalogues for AI tagging and search",
          tags: ['music'],
          audienceOnly: true,
        },
        {
          text: 'Partnered with the music research team and in-house experts to design the labeling and model validation processes',
          tags: ['music'],
          audienceOnly: true,
        },
        {
          text: 'Ran GCP on Kubernetes and Istio with Grafana and Prometheus, and rebuilt CI/CD on Jenkins with Cypress tests',
          tags: ['ai-eng'],
        },
        'Introduced Scrum and the planning practices around it',
        'Mentored engineers and ran training sessions based on operational reviews',
      ],
      skills: [
        'Python',
        'GCP',
        'Container Orchestration',
        'Docker',
        'Jenkins',
        'Cypress',
        'Agile',
        'Team Leadership',
      ],
    },
    {
      title: 'CEO & Co-Founder',
      company: 'Archanan',
      engagement: 'full-time',
      // Deliberately short on the engineering-focused pages. The fundraising
      // and board bullets below are tagged `exec`, so those pages never see
      // them and the role reads as four years of shipping a hard product to
      // demanding customers.
      variants: {
        resume: { maxBullets: 3 },
        fde: { maxBullets: 2 },
        'ai-engineer': { maxBullets: 2 },
      },
      location: 'Singapore, SG',
      duration: '2018 - 2022',
      achievements: [
        // February 2018 founding to the April 2019 launch.
        {
          text: 'Set technical direction and prototyped a supercomputer-emulation platform with my co-founder, launched in 14 months',
          tags: ['fde', 'ai-eng'],
          metric: '14 months',
        },
        {
          text: 'Raised a seed round from VCs and angels and grew the team to 15 across two offices',
          metric: '15',
        },
        {
          text: 'Sold to national supercomputing centres and enterprise R&D teams across Asia-Pacific',
          tags: ['fde', 'ai-eng'],
        },
        {
          text: 'Set the business model, go-to-market strategy, and financial model',
          tags: ['exec'],
        },
        {
          text: 'Managed relationships with several levels of government across the region',
          tags: ['exec'],
        },
        {
          text: 'Ran investor relations and board communications',
          tags: ['exec'],
        },
        {
          text: 'Negotiated the contracts with partners and suppliers',
          tags: ['exec'],
        },
      ],
      skills: [
        'Leadership',
        'Business Strategy',
        'Fundraising',
        'Product Management',
        'Team Building',
      ],
    },
    {
      title: 'Founder in Residence',
      company: 'Entrepreneur First',
      engagement: 'full-time',
      location: 'Singapore, SG',
      duration: 'Jan 2018 - Jun 2018',
      achievements: [
        'Co-founded Archanan out of the programme',
        'Secured letters of intent from early customers before committing to a build',
        'Tested several ideas with potential customers and dropped the ones that did not hold up',
        'Built the financial model and go-to-market plan',
        'Led the first fundraise',
        "Formed the company's early partnerships",
      ],
      skills: [
        'Entrepreneurship',
        'Market Research',
        'Financial Modeling',
        'Business Development',
      ],
    },
    {
      title: 'CTO, Chief Mathematician',
      company: 'Scala Computing',
      engagement: 'full-time',
      // A decade back. The role-specific pages cover the last eight years in
      // detail, so this one is collapsed to a single line there: it keeps the
      // history continuous without spending the page on it.
      variants: {
        resume: { maxBullets: 2 },
        fde: { maxBullets: 1, collapse: true },
        'ai-engineer': { maxBullets: 1, collapse: true },
      },
      location: 'New York, NY',
      duration: '2016 - 2017',
      achievements: [
        // The line the role pages keep when they collapse this entry: what was
        // built says more there than the team size does.
        {
          text: 'Built job scheduling optimization for grid-style workflows on commodity hardware, then ported it to cloud and bare metal',
          tags: ['fde', 'ai-eng'],
        },
        'Directed the algorithm work behind the scheduling optimization',
        'Worked directly with clients on what to build next',
        {
          text: 'Led engineering as the team grew from 2 to 20+ people',
          metric: '2 to 20+',
        },
        'Set the code review and QA standards',
        {
          text: 'Raised seed capital from VCs and angels',
          tags: ['exec'],
        },
        {
          text: 'Got the company into the Grand Central Tech accelerator',
          tags: ['exec'],
        },
      ],
      skills: [
        'Mathematics',
        'Software Development',
        'Team Leadership',
        'Algorithm Design',
        'Cloud Computing',
      ],
    },
    {
      title: 'Artist in Residence',
      // The full name — Center of Excellence in Wireless Information
      // Technology — is too long to set beside a date range: it wraps, and the
      // date lands between the two halves of the title, so "Technology" comes
      // out as an orphan line and the company is severed from the role. It is
      // spelled out in `description` instead, where it has a line to itself.
      // `check-cv-text.js` fails on any entry that reproduces this.
      company: 'CEWIT, Stony Brook University',
      engagement: 'part-time',
      description:
        'The Center of Excellence in Wireless Information Technology.',
      // Off every one-pager but the music-tech one, where it is the point.
      variants: {
        'music-tech': { maxBullets: 2 },
      },
      location: 'Stony Brook, NY',
      duration: '2016 - 2017',
      achievements: [
        {
          text: 'Designed, prototyped, and tested audio synthesizers, including the circuit design',
          tags: ['music'],
        },
        'Led seminars on music and mathematics',
        'Turned research into pieces that could be performed',
        {
          text: "Collaborated on synthesis with Pigtronix, my startup Motiff Tech, and Stony Brook's digital arts center",
          tags: ['music'],
        },
      ],
      skills: [
        'Audio Engineering',
        'Circuit Design',
        'Music Technology',
        'Research',
        'Creative Technology',
      ],
    },
    {
      title: 'Researcher',
      company: 'SUNY Research Foundation',
      engagement: 'part-time',
      variants: {
        'music-tech': { maxBullets: 1 },
      },
      location: 'Stony Brook, NY',
      duration: '2016 - 2017',
      achievements: [
        {
          text: 'Researched optimal wavelet bases for audio compression in C++ on HPC clusters, running experiments that scored timbre coherence against compression ratio',
          tags: ['music'],
        },
        'Ran a supercomputing project funded by the High Performance Computing Consortium of New York',
        'Maintained project documentation and datasets for other researchers',
      ],
      skills: [
        'Research',
        'Signal Processing',
        'Supercomputing',
        'Data Analysis',
        'Academic Writing',
      ],
    },
    {
      title: 'Assistant Product Engineer',
      company: 'Absara Audio',
      engagement: 'full-time',
      variants: {
        'music-tech': { maxBullets: 2 },
      },
      location: 'Port Jefferson, NY',
      duration: '2014 - 2015',
      description: 'My first software job, and my first hardware job.',
      achievements: [
        {
          text: 'Wrote and tested production firmware for digital guitar pedals, building the test fixtures',
          tags: ['music'],
        },
        {
          text: 'Developed a digital tape loop emulator in Objective-C',
          tags: ['music'],
          audienceOnly: true,
        },
        {
          text: 'Turned customer service reports into technical reports, and worked with the engineering team to diagnose and triage the underlying issues',
          tags: ['music'],
          audienceOnly: true,
        },
        "Shipped feature releases through the team's continuous integration process",
        "Followed the team's test practice to catch firmware defects before release",
        'Wrote the technical documentation and user manuals',
        'Fed customer feedback into product planning',
      ],
      skills: [
        'Firmware Development',
        'Embedded Systems',
        'Technical Writing',
        'Product Development',
      ],
    },
    {
      title: 'Technician',
      company: 'Absara Audio',
      engagement: 'part-time',
      location: 'Port Jefferson, NY',
      duration: '2010 - 2014',
      achievements: [
        'Assembled and tested printed circuit boards for audio processing units',
        'Was the customer service contact point, answering the calls and emails and handling repairs and returns',
        'Serviced customer hardware sent back to the shop',
        'Trained new staff on assembly and quality control',
      ],
      skills: [
        'Hardware Assembly',
        'Quality Control',
        'Customer Service',
        'Technical Support',
      ],
    },
  ],

  education: [
    {
      // Not "Ph.D. ... (Incomplete)". That phrasing parses as a completed
      // doctorate about as often as it parses as an abandoned one, and reads
      // as a flag either way. "Graduate Studies" over a closed date range is
      // the accurate claim and needs no qualifier.
      degree: 'Graduate Studies, Computational Applied Mathematics',
      institution: 'Stony Brook University',
      location: 'Stony Brook, NY',
      duration: '2016 - 2017',
      description: 'Left before advancing to candidacy to start a company.',
      relevantCoursework: [
        'Numerical Analysis',
        'Numerical Partial Differential Equations',
        'Numerical Linear Algebra',
        'Data Analysis',
        'Applied Real Analysis',
        'Applied Complex Analysis',
        'Parallel Computing',
      ],
      achievements: [
        'Research at the Center of Excellence in Wireless Information Technology (CEWIT) and the SUNY Research Foundation, on audio compression and signal analysis',
      ],
    },
    {
      degree: "Bachelor's Degree (BS), Applied Mathematics and Statistics",
      institution: 'Stony Brook University',
      location: 'Stony Brook, NY',
      duration: '2013 - 2015',
      relevantCoursework: [
        'Applied Real and Fourier Analysis',
        'Computation Modeling of Physiological Systems',
        'Discrete Mathematics',
        'Modern Mathematics',
        'Linear Algebra',
        'Operations Research: Deterministic Models',
        'Survey of Probability and Statistics',
        'Research Practices in Biomedical Engineering',
        'Modern Physics',
        'Molecular and Organic Chemistry',
      ],
      achievements: ['Member of the University Scholars Program'],
    },
  ],

  certifications: [
    {
      name: 'AWS Business Professional',
      issuer: 'Amazon Web Services',
      date: '2018',
    },
    {
      name: 'AWS TCO and Cloud Economics',
      issuer: 'Amazon Web Services',
      date: '2018',
    },
    {
      name: 'Responsible Conduct of Research in Engineering',
      issuer: 'CITI Program',
      date: '2017',
    },
  ],

  skills: {
    // Every entry has to be true of work described somewhere above — this
    // list is what a keyword filter reads, not a wishlist. It is ordered once,
    // for every page: what the engineer is, then the AI work, then the
    // platform under it, then the tooling. A tag offers a term to that page;
    // the general documents carry every term that is not `audienceOnly`.
    technical: [
      // The deeper tooling is tagged `ai-eng`: the general resume and the AI
      // Engineer page carry it, the FDE page keeps the essentials, and the
      // music-tech page spends its lines on audio instead.
      'Python',
      { name: 'C++', tags: ['music'], audienceOnly: true },
      'SQL',
      { name: 'Mathematics', tags: ['fde', 'music'] },
      // The Python service stack behind the Perch and Influize backends.
      { name: 'FastAPI', tags: ['fde', 'ai-eng'] },
      { name: 'Pydantic', tags: ['fde', 'ai-eng'] },
      { name: 'SQLAlchemy', tags: ['ai-eng'] },
      { name: 'Alembic', tags: ['ai-eng'] },
      { name: 'asyncio', tags: ['ai-eng'] },
      { name: 'Polars', tags: ['ai-eng'] },
      { name: 'pytest', tags: ['fde', 'ai-eng'] },
      { name: 'Signal Processing', tags: ['music'], audienceOnly: true },
      // Shown to the music-tech page only.
      { name: 'Audio Synthesis', tags: ['music'], audienceOnly: true },
      { name: 'Audio Compression', tags: ['music'], audienceOnly: true },
      { name: 'Real-time Audio', tags: ['music'], audienceOnly: true },
      // The LLM-systems vocabulary, each term backed by a Perch or Influize
      // bullet: the harness, its memory, its eval suite and its guardrail
      // cases. "Tool use" is in the eval bullet's own words.
      'LLMs',
      'Agents',
      { name: 'Agent Memory', tags: ['fde', 'ai-eng'] },
      { name: 'Context Engineering', tags: ['fde', 'ai-eng'] },
      { name: 'Harness Engineering', tags: ['fde', 'ai-eng'] },
      { name: 'Evals', tags: ['fde', 'ai-eng', 'music'] },
      { name: 'LLM-as-judge', tags: ['ai-eng'] },
      { name: 'Guardrails', tags: ['fde', 'ai-eng'] },
      { name: 'RAG', tags: ['fde', 'ai-eng'] },
      // The tools the agents are built with, named because a filter for a
      // framework does not match a category.
      { name: 'Anthropic and OpenAI APIs', tags: ['fde', 'ai-eng'] },
      { name: 'MCP', tags: ['fde', 'ai-eng'] },
      { name: 'PydanticAI', tags: ['fde', 'ai-eng'] },
      { name: 'LangGraph', tags: ['fde', 'ai-eng'] },
      { name: 'DSPy', tags: ['ai-eng'] },
      { name: 'LiteLLM', tags: ['ai-eng'] },
      { name: 'Langfuse', tags: ['ai-eng'] },
      { name: 'Claude Code', tags: ['fde', 'ai-eng'] },
      // The data the agents stand on: the semantic layer at Perch, the graph
      // retrieval at Influize, the copilot's knowledge graph.
      'PostgreSQL',
      { name: 'pgvector', tags: ['ai-eng'] },
      { name: 'Redis', tags: ['ai-eng'] },
      { name: 'OpenSearch', tags: ['ai-eng'] },
      { name: 'Vector Search', tags: ['ai-eng'] },
      { name: 'Knowledge Graphs', tags: ['fde', 'ai-eng'] },
      { name: 'Semantic Layers', tags: ['fde', 'ai-eng'] },
      { name: 'Data Engineering', tags: ['fde', 'music'] },
      // The platform. AWS is named once rather than by service: the list of
      // services would be long, and the bullets say which ones mattered.
      'AWS',
      'Docker',
      'CI/CD (GitHub Actions)',
      { name: 'Celery', tags: ['ai-eng'] },
      { name: 'OpenTelemetry', tags: ['ai-eng'] },
      { name: 'Grafana', tags: ['ai-eng'] },
      // The pages without OpenTelemetry and Grafana say it as a category.
      { name: 'Observability', tags: ['fde', 'music'], audienceOnly: true },
      { name: 'Linux', tags: ['fde'], audienceOnly: true },
      // Used every week, but not claimed as expertise: said so in the term
      // itself, which a keyword filter still reads as both languages.
      'TypeScript and Rust (working knowledge)',
      // The customer-side of the FDE work. Pre-sales is a sales word, and
      // stays off the general documents.
      { name: 'Solution Architecture', tags: ['fde'], audienceOnly: true },
      { name: 'Technical Pre-Sales', tags: ['fde'], audienceOnly: true },
    ],
  },

  // Named from `src/config/projects.ts`. The CrewAI-era experiments are
  // deliberately absent from every resume variant despite being the
  // best-starred: they are two years old and read as dated demos next to the
  // libraries below.
  projects: {
    full: ['fugue', 'quiver', 'fugue-evo', 'principled', 'claude-telegram'],
    fde: ['fugue', 'reflex', 'principled'],
    'ai-engineer': ['reflex', 'principled', 'fugue'],
    'music-tech': ['quiver', 'auracle', 'llmcomposer'],
  },
};

/**
 * Turns the project names a variant asks for into `ProjectItem`s.
 *
 * The descriptions, links and languages live in `src/config/projects.ts`, which
 * the projects page already renders — naming them here rather than restating
 * them keeps one description per project. Order follows the names as listed,
 * not the order of the projects file, so a variant leads with what matters to
 * its reader. An unknown name is dropped rather than rendered empty; the CI
 * guard fails on it, so a typo surfaces in the build and not in a PDF.
 */
/**
 * Descriptions as a resume sets them. The projects page writes them in its
 * own lowercase voice ("rust", "llm"), which on a resume reads as a typo, so
 * every project a variant names gets a cased sentence here.
 */
const CV_PROJECT_DESCRIPTIONS: Record<string, string> = {
  fugue: 'A type-safe, monadic probabilistic programming library for Rust.',
  'fugue-evo':
    'A probabilistic genetic algorithm library for Rust: evolution as inference.',
  quiver: 'A modular audio synthesis library in Rust.',
  auracle: 'A synthesizer that evolves patches toward the ones you prefer.',
  llmcomposer: 'An experiment in composing music with an LLM.',
  reflex: 'A template for real-time AI agent systems.',
  principled: 'Claude Code plugins for specification-first development.',
  'claude-telegram':
    'A Telegram bridge to Claude Code, so you can drive it from your phone.',
};

const resolveProjects = (names?: string[]): ProjectItem[] | undefined => {
  if (!names || names.length === 0) return undefined;

  return names.flatMap((name): ProjectItem[] => {
    const project = projectsConfig.projects.find(p => p.name === name);
    if (!project) return [];
    return [
      {
        name: project.name,
        description: CV_PROJECT_DESCRIPTIONS[name] ?? project.description,
        technologies: [project.language],
        github: project.url,
        url: project.site,
      },
    ];
  });
};

/** The names in `cvSource.projects` that no project in `projects.ts` matches. */
export const unknownProjectNames = (source: CVSource = cvSource): string[] => {
  const known = new Set(projectsConfig.projects.map(p => p.name));
  const named = Object.values(source.projects ?? {}).flat();
  return named.filter((name, index) => {
    if (known.has(name)) return false;
    return named.indexOf(name) === index;
  });
};

/**
 * The audience each role variant selects bullets for. Every role variant must
 * have one — the type says so — and the neutral pages select none.
 */
const AUDIENCE: Record<RoleVariant, AudienceTag> = {
  fde: 'fde',
  'ai-engineer': 'ai-eng',
  'music-tech': 'music',
};

const bulletText = (bullet: Bullet): string =>
  typeof bullet === 'string' ? bullet : bullet.text;

const bulletTags = (bullet: Bullet): AudienceTag[] =>
  typeof bullet === 'string' ? [] : (bullet.tags ?? []);

const hasMetric = (bullet: Bullet): boolean =>
  typeof bullet !== 'string' && Boolean(bullet.metric);

/** Is this bullet or skill kept off the documents that select no audience? */
const isAudienceOnly = (item: Bullet | Skill): boolean =>
  typeof item !== 'string' && Boolean(item.audienceOnly);

const audienceOf = (variant: CVVariant): AudienceTag | undefined =>
  isRoleVariant(variant) ? AUDIENCE[variant] : undefined;

/**
 * Is `item` offered to `variant`? Neutral items go everywhere; tagged items
 * go to their audiences, and to the documents selecting no audience unless
 * they are `audienceOnly`.
 */
const isEligible = (
  tags: AudienceTag[],
  audienceOnly: boolean,
  audience?: AudienceTag
): boolean => {
  if (tags.length === 0) return true;
  return audience ? tags.includes(audience) : !audienceOnly;
};

/**
 * The skills line for one variant: what `technical` offers it, in the order
 * it is authored. Tags decide membership and nothing else, so one list, read
 * once, is the order on every page.
 */
const selectSkills = (skills: Skill[], variant: CVVariant): string[] => {
  const audience = audienceOf(variant);
  const tagsOf = (skill: Skill): AudienceTag[] =>
    typeof skill === 'string' ? [] : (skill.tags ?? []);
  return skills
    .filter(skill => isEligible(tagsOf(skill), isAudienceOnly(skill), audience))
    .map(skill => (typeof skill === 'string' ? skill : skill.name));
};

/**
 * Picks and orders one role's bullets for one variant.
 *
 * A bullet is eligible if it is neutral — no tags — or carries this variant's
 * audience tag; on the neutral one-pager, which selects no audience, every
 * bullet is eligible except one marked `audienceOnly`. Eligible bullets are
 * then ordered: on-audience first, and
 * within each group the ones carrying a metric ahead of the ones that do not,
 * so what survives the trim to a page is the most specific evidence available.
 * Both passes are stable, so the strongest-first order this file is authored in
 * still decides every remaining tie.
 */
const selectBullets = (
  achievements: Bullet[],
  variant: CVVariant,
  limit: number
): string[] => {
  const audience = audienceOf(variant);

  const eligible = achievements.filter(bullet =>
    isEligible(bulletTags(bullet), isAudienceOnly(bullet), audience)
  );

  const rank = (bullet: Bullet): number => {
    const onAudience = audience && bulletTags(bullet).includes(audience);
    return (onAudience ? 0 : 2) + (hasMetric(bullet) ? 0 : 1);
  };

  return eligible
    .map((bullet, index) => ({ bullet, index }))
    .sort((a, b) => rank(a.bullet) - rank(b.bullet) || a.index - b.index)
    .slice(0, limit)
    .map(({ bullet }) => bulletText(bullet));
};

/**
 * Resolves `cvSource` into the `CVData` one document renders from.
 *
 * The full CV takes everything in the order it is authored — nothing is
 * reordered or trimmed, because nothing has to fit, and nothing is filtered
 * but the bullets marked `audienceOnly`. Every other
 * variant keeps only the roles that name it in `variants`, and only the
 * bullets `selectBullets` returns for it. Coursework and certifications go
 * unconditionally on the one-pagers: they are the first things to cost a page
 * and the last things anyone reads.
 */
export const buildVariant = (
  variant: CVVariant,
  source: CVSource = cvSource
): CVData => {
  const isFull = variant === 'full';

  const experience: ExperienceItem[] = isFull
    ? source.experience.map(({ achievements, variants: _omit, ...role }) => ({
        ...role,
        achievements: achievements
          .filter(bullet => !isAudienceOnly(bullet))
          .map(bulletText),
      }))
    : source.experience.flatMap(
        ({ achievements, variants, ...role }): ExperienceItem[] => {
          const rule = variants?.[variant];
          if (!rule) return [];
          return [
            {
              ...role,
              collapsed: rule.collapse,
              achievements: selectBullets(
                achievements,
                variant,
                rule.collapse ? 1 : rule.maxBullets
              ),
            },
          ];
        }
      );

  return {
    personal: {
      ...source.personal,
      title:
        (!isFull && source.personal.titleByVariant?.[variant]) ||
        source.personal.title,
      summary:
        (!isFull && source.personal.summaryByVariant?.[variant]) ||
        source.personal.summary,
    },
    experience,
    education: isFull
      ? source.education
      : source.education.map(({ relevantCoursework: _omit, ...rest }) => rest),
    certifications: isFull ? source.certifications : [],
    projects: resolveProjects(source.projects?.[variant]),
    skills: {
      technical: selectSkills(source.skills.technical, variant),
      groups: groupSkills(selectSkills(source.skills.technical, variant)),
      soft: source.skills.soft,
      languages: source.skills.languages,
    },
    publications: source.publications,
    awards: source.awards,
  };
};

/**
 * The PDF each variant is typeset into, and how long it is allowed to run.
 *
 * `scripts/lib/cv-targets.js` builds from this and `scripts/check-cv-text.js`
 * verifies it, so the filenames the site links at and the filenames the build
 * writes are the same strings. Key order is build order.
 */
export const CV_ARTIFACTS: Record<
  CVVariant,
  { name: string; maxPages: number | null }
> = {
  resume: { name: 'alex-nodeland-resume', maxPages: 1 },
  fde: { name: 'alex-nodeland-fde', maxPages: 1 },
  'ai-engineer': { name: 'alex-nodeland-ai-engineer', maxPages: 1 },
  'music-tech': { name: 'alex-nodeland-music-tech', maxPages: 1 },
  full: { name: 'alex-nodeland-cv', maxPages: null },
};

/** Where a variant's PDF is served from. */
export const cvPdfPath = (variant: CVVariant): string =>
  `/cv/${CV_ARTIFACTS[variant].name}.pdf`;

/** The full CV — every role, every bullet, in the order they are authored. */
export const cvData: CVData = buildVariant('full');

/** The neutral one-page resume. */
export const resumeData: CVData = buildVariant('resume');
