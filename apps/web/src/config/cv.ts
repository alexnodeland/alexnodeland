import { projectsConfig } from './projects';

/**
 * Which document is being produced.
 *
 *   full        — the complete CV, every role and every bullet
 *   resume      — the neutral one-pager
 *   fde         — one page aimed at Forward Deployed Engineer roles
 *   ai-engineer — one page aimed at AI Engineer roles
 */
export type CVVariant = 'full' | 'resume' | 'fde' | 'ai-engineer';

/**
 * Who a bullet is written for.
 *
 * A bullet carrying a tag is offered to the variants that share it and
 * withheld from the ones that do not — so `exec` bullets (fundraising, board,
 * investor relations) stay off the IC-facing pages, which is most of what
 * makes a CEO/CTO history read as overqualified. A bullet with no tags at all
 * is neutral and eligible everywhere.
 */
export type AudienceTag = 'fde' | 'ai-eng' | 'exec' | 'hardware';

/**
 * How a role was held. Rendered beside the dates so overlapping entries read
 * as concurrent commitments rather than as job-hopping.
 */
export type EngagementType =
  'full-time' | 'part-time' | 'advisory' | 'freelance';

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
       * The figure this bullet carries, repeated here so the generator can
       * prefer it when trimming to a page. The number must also appear in
       * `text` — this field ranks, it does not render.
       */
      metric?: string;
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
    summary: string;
  };

  experience: ExperienceItem[];
  education: EducationItem[];
  certifications: CertificationItem[];
  projects?: ProjectItem[];
  skills: {
    technical: string[];
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
    technical: string[];
    /** A keyword list per variant. Falls back to `technical`. */
    byVariant?: Partial<Record<CVVariant, string[]>>;
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
    location: 'Upstate, New York, USA',
    website: 'alexnodeland.com',
    summary:
      'Engineer and mathematician working on AI systems at Perch Insights: agent orchestration, evaluation infrastructure, and the semantic models they run on. Previously co-founded and ran a supercomputing startup in Singapore for four years, led engineering at a music-ML company later acquired by SoundCloud, and researched audio compression on HPC clusters at Stony Brook. Interested in problems that need both mathematics and production engineering.',
    summaryByVariant: {
      // Leads with the delivery work, and closes on the diagnosis from the
      // consulting page — which is the argument for hiring someone to sit
      // between a customer and a system that has to work in their hands.
      fde: 'Engineer who takes LLM systems from a prototype to something that holds up in front of customers. At Perch Insights I build the agent orchestration and evaluation infrastructure behind an analytics product, and designed the DSL non-technical users write their own analysis workflows in. Before that I co-founded a supercomputing startup in Singapore, won Fortune 500 and national-government customers, and led engineering at a music-ML company SoundCloud acquired. Prototypes that demo well and break in production are usually failing on the data model, the evals, or how failures are handled, not on the model.',
      // Leads with shipped systems and names them concretely. The founder
      // years are one clause: enough to account for the time, not enough to
      // read as a chief executive applying for an IC role.
      'ai-engineer':
        'AI engineer building production LLM systems: agent orchestration, evaluation infrastructure, and the feedback loops that keep them honest. At Perch Insights I built a DAG-based framework that runs autonomous agents through multi-step data analysis, a correction-to-evaluation loop that improves the system without retraining, and lineage that traces every generated number back to its source. Earlier I built the RAG pipeline at Influize, ran a fault-tolerant worker fleet on AWS, co-founded a supercomputing startup, and researched audio compression on HPC clusters at Stony Brook. Mathematician by training.',
    },
  },

  experience: [
    {
      title: 'Senior AI Engineer',
      company: 'Perch Insights',
      // The most relevant role on every page, and the one the AI Engineer
      // variant spends most of its room on.
      variants: {
        resume: { maxBullets: 3 },
        fde: { maxBullets: 3 },
        'ai-engineer': { maxBullets: 4 },
      },
      location: 'Remote, NY',
      duration: '2024 - Present',
      achievements: [
        {
          text: 'Built a DAG-based orchestration framework that lets autonomous agents carry out multi-step data analysis end to end',
          tags: ['ai-eng'],
        },
        {
          text: 'Designed a DSL that non-technical users write analysis workflows in, mixing LLM agents with conventional ML models in the same pipeline',
          tags: ['fde', 'ai-eng'],
        },
        'Extended the semantic data model with ontological abstractions and higher-order business concepts, which automated root-cause analysis and data discovery are built on',
        {
          text: 'Built a feedback loop that turns user corrections into evaluation data and few-shot examples, so the system improves without retraining',
          tags: ['ai-eng'],
        },
        {
          text: 'Wrote tabular insight agents on Jinja templates with full lineage and provenance, so every generated number can be traced back to its source',
          tags: ['ai-eng'],
        },
        'Ran a fault-tolerant distributed worker fleet on AWS (ECS/SNS/SQS) with dead-letter queue handling and zero-downtime deploys',
        {
          text: 'Lead AI engineering for the analytics product, automating analyst workflows that were previously manual',
          tags: ['fde'],
        },
      ],
      skills: [
        'Python',
        'AWS',
        'Docker',
        'Kubernetes',
        'Machine Learning',
        'LLMs',
        'Data Engineering',
      ],
    },
    {
      title: 'Head of AI',
      company: 'Influize',
      variants: {
        resume: { maxBullets: 3 },
        fde: { maxBullets: 2 },
        'ai-engineer': { maxBullets: 3 },
      },
      location: 'Remote, NY',
      duration: '2023 - 2024',
      achievements: [
        'Started the AI function and shipped its first systems to production',
        {
          text: "Built the RAG pipeline behind the product's generated responses, covering retrieval, chunking, and grounding",
          tags: ['ai-eng'],
        },
        'Designed the Postgres schema and backend on Supabase, including authentication and access control',
        {
          text: 'Designed the API layer in front of the AI pipelines, improving latency and throughput',
          tags: ['ai-eng'],
        },
        'Moved infrastructure to CloudFormation and CI/CD to GitHub Actions',
        {
          text: 'Added monitoring across the AI pipelines to catch quality regressions',
          tags: ['ai-eng'],
        },
        'Built ontological models to give the data model a consistent vocabulary',
        'Restructured the Postgres schema as the access patterns became clear and load grew',
        {
          text: 'Coordinated with external development teams on platform integration, and ran project management out of GitHub',
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
      },
      location: 'Remote, NY',
      duration: '2022 - Present',
      achievements: [
        {
          text: 'Advise startups and established companies on where AI fits in their stack',
          tags: ['fde'],
        },
        'Delivered a keynote on ChatGPT to a room of CIOs and founders',
        {
          text: 'Advised a blockchain unicorn on engineering process and operational flow',
          tags: ['fde'],
        },
        {
          text: 'Run technology assessments and build-versus-buy analysis for teams committing to an AI direction',
          tags: ['fde'],
        },
        'Led migrations onto AI-integrated systems that reduced cost and manual work',
        'Consulted on personal knowledge management systems built around LLMs',
        'Help early-stage startups choose a technology stack that will last',
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
      variants: {
        resume: { maxBullets: 2 },
        fde: { maxBullets: 2 },
        'ai-engineer': { maxBullets: 2 },
      },
      location: 'Singapore',
      duration: '2021 - 2022',
      achievements: [
        {
          text: 'Set technical direction against customer and partner requirements, planning releases with the founders',
          tags: ['fde'],
        },
        'Led a cross-functional engineering team, working alongside the music, research, and sales sides of the company',
        {
          text: 'Ran GCP infrastructure: Kubernetes and Istio, monitored with Grafana and Prometheus',
          tags: ['ai-eng'],
        },
        'Rebuilt CI/CD on Jenkins with Cypress end-to-end coverage',
        {
          text: 'Built a custom data ingestion pipeline and automated the manual steps around it',
          tags: ['ai-eng'],
        },
        'Introduced Scrum and the planning practices around it',
        'Mentored engineers and ran training sessions based on operational reviews',
      ],
      skills: [
        'Python',
        'GCP',
        'Kubernetes',
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
      // Deliberately short on the IC-facing pages. The fundraising and board
      // bullets below are tagged `exec`, so those pages never see them and the
      // role reads as four years of shipping a hard product to demanding
      // customers rather than as a chief executive applying for a coding job.
      variants: {
        resume: { maxBullets: 3 },
        fde: { maxBullets: 2 },
        'ai-engineer': { maxBullets: 2 },
      },
      location: 'Singapore, SG',
      duration: '2018 - 2022',
      achievements: [
        'Took the product from concept to launch: a cloud platform that emulates supercomputer environments so teams can develop and test at scale without waiting for time on the real machine',
        {
          text: 'Won early customers including Fortune 500 companies and national governments',
          tags: ['fde'],
        },
        {
          text: 'Raised early rounds from government, VC, and angel investors',
          tags: ['exec'],
        },
        'Grew the team from 3 to 15 in the first year',
        {
          text: 'Set the business model, go-to-market strategy, and financial model',
          tags: ['exec'],
        },
        {
          text: 'Managed relationships with several levels of government across the region',
          tags: ['fde', 'exec'],
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
        'Designed and built the MVPs, then the production cloud middleware that replaced them',
        "Directed algorithm development for the product's core computational problems",
        {
          text: 'Worked directly with clients on what to build next',
          tags: ['fde'],
        },
        'Led the engineering team and set its code review and QA standards',
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
      description:
        'The Center of Excellence in Wireless Information Technology.',
      location: 'Stony Brook, NY',
      duration: '2016 - 2017',
      achievements: [
        'Designed, prototyped, and tested audio synthesizers, including the circuit design',
        'Led seminars on music and mathematics',
        'Turned research into pieces that could be performed',
        'Collaborated with people from the music technology industry on novel audio hardware',
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
      location: 'Stony Brook, NY',
      duration: '2016 - 2017',
      achievements: [
        'Researched optimal wavelet bases for audio compression, looking for a general selection procedure',
        'Ran a supercomputing project funded by the High Performance Computing Consortium of New York',
        'Performed real-time signal analysis on spectrum data',
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
      location: 'Port Jefferson, NY',
      duration: '2014 - 2015',
      description: 'My first software job, and my first hardware job.',
      achievements: [
        'Wrote production firmware for digital guitar pedals',
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
      location: 'Port Jefferson, NY',
      duration: '2010 - 2014',
      achievements: [
        'Assembled and tested printed circuit boards for audio processing units',
        'Ran technical customer service, including repairs and returns',
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
    technical: [
      'Python',
      'JavaScript/TypeScript',
      'React',
      'Node.js',
      'AWS',
      'GCP',
      'Docker',
      'Kubernetes',
      'PostgreSQL',
      'Machine Learning',
      'LLMs',
      'RAG Systems',
      'Data Engineering',
      'API Development',
      'Infrastructure as Code',
      'CI/CD',
      'Agile/Scrum',
      'Git',
      'Linux',
      'Mathematics',
      'Signal Processing',
    ],
    // One list per document, ordered so the terms a reader is scanning for sit
    // at the front. Every entry has to be true of work described somewhere
    // above — this list is what a keyword filter reads, not a wishlist.
    byVariant: {
      fde: [
        'Python',
        'TypeScript',
        'LLMs',
        'Agents',
        'Evals',
        'RAG',
        'AWS',
        'GCP',
        'Docker',
        'Kubernetes',
        'PostgreSQL',
        'Data Engineering',
        'API Development',
        'Infrastructure as Code',
        'CI/CD',
        'Observability',
        'Solution Architecture',
        'Customer Discovery',
        'Technical Pre-Sales',
        'Linux',
      ],
      'ai-engineer': [
        'Python',
        'TypeScript',
        'LLMs',
        'Agents',
        'Tool Use',
        'Evals',
        'RAG',
        'Vector Search',
        'Prompt Engineering',
        'Semantic Data Models',
        'Observability',
        'AWS',
        'Docker',
        'Kubernetes',
        'PostgreSQL',
        'Data Engineering',
        'Distributed Systems',
        'CI/CD',
        'Rust',
        'Mathematics',
      ],
    },
  },

  // Named from `src/config/projects.ts`. The CrewAI-era experiments are
  // deliberately absent from every resume variant despite being the
  // best-starred: they are two years old and read as dated demos next to the
  // libraries below.
  projects: {
    full: ['fugue', 'quiver', 'fugue-evo', 'principled', 'claude-telegram'],
    fde: ['principled', 'claude-telegram', 'fugue'],
    'ai-engineer': ['reflex', 'principled', 'fugue'],
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
const resolveProjects = (names?: string[]): ProjectItem[] | undefined => {
  if (!names || names.length === 0) return undefined;

  return names.flatMap((name): ProjectItem[] => {
    const project = projectsConfig.projects.find(p => p.name === name);
    if (!project) return [];
    return [
      {
        name: project.name,
        description: project.description,
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

/** The audience a variant selects bullets for. The neutral pages select none. */
const AUDIENCE: Partial<Record<CVVariant, AudienceTag>> = {
  fde: 'fde',
  'ai-engineer': 'ai-eng',
};

const bulletText = (bullet: Bullet): string =>
  typeof bullet === 'string' ? bullet : bullet.text;

const bulletTags = (bullet: Bullet): AudienceTag[] =>
  typeof bullet === 'string' ? [] : (bullet.tags ?? []);

const hasMetric = (bullet: Bullet): boolean =>
  typeof bullet !== 'string' && Boolean(bullet.metric);

/**
 * Picks and orders one role's bullets for one variant.
 *
 * A bullet is eligible if it is neutral — no tags — or carries this variant's
 * audience tag. Eligible bullets are then ordered: on-audience first, and
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
  const audience = AUDIENCE[variant];

  const eligible = achievements.filter(bullet => {
    const tags = bulletTags(bullet);
    if (tags.length === 0) return true;
    return audience ? tags.includes(audience) : true;
  });

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
 * filtered, reordered or trimmed, because nothing has to fit. Every other
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
        achievements: achievements.map(bulletText),
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
      technical: source.skills.byVariant?.[variant] ?? source.skills.technical,
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
  full: { name: 'alex-nodeland-cv', maxPages: null },
};

/** Where a variant's PDF is served from. */
export const cvPdfPath = (variant: CVVariant): string =>
  `/cv/${CV_ARTIFACTS[variant].name}.pdf`;

/** The full CV — every role, every bullet, in the order they are authored. */
export const cvData: CVData = buildVariant('full');

/** The neutral one-page resume. */
export const resumeData: CVData = buildVariant('resume');

/** The one-pager aimed at Forward Deployed Engineer roles. */
export const fdeData: CVData = buildVariant('fde');

/** The one-pager aimed at AI Engineer roles. */
export const aiEngineerData: CVData = buildVariant('ai-engineer');
