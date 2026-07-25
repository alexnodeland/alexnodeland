export interface ExperienceItem {
  title: string;
  company: string;
  location: string;
  duration: string;
  description?: string;
  /** Ordered strongest-first — the one-page resume takes the top `resume.maxBullets`. */
  achievements: string[];
  skills?: string[];
  highlights?: string[];
  /** Omit to leave this role off the one-page resume entirely. */
  resume?: { maxBullets: number };
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
    soft: string[];
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

export const cvData: CVData = {
  personal: {
    name: 'Alex Nodeland',
    title: 'Senior AI Engineer',
    email: 'alex@ournature.studio',
    location: 'Upstate, New York, USA',
    website: 'alexnodeland.com',
    summary:
      'Engineer and mathematician working on AI systems — agent orchestration, evaluation infrastructure, and the semantic models underneath — currently at Perch Insights. Previously co-founded and ran a supercomputing startup in Singapore for four years, led engineering at a music-ML company acquired by SoundCloud, and researched audio compression on HPC clusters at Stony Brook. Most useful on problems that sit between mathematics and production systems.',
  },

  experience: [
    {
      title: 'Senior AI Engineer',
      company: 'Perch Insights',
      resume: { maxBullets: 3 },
      location: 'Remote, NY',
      duration: '2024 - Present',
      achievements: [
        'Built a DAG-based orchestration framework that lets autonomous agents carry out multi-step data analysis end to end',
        'Designed a DSL that non-technical users write analysis workflows in, mixing LLM agents with conventional ML models in the same pipeline',
        'Extended the semantic data model with ontological abstractions and higher-order business concepts — the layer that makes automated root-cause analysis and data discovery possible at all',
        'Built the feedback loop that turns user corrections into evaluation data and downstream few-shot examples, so the system improves without a retraining cycle',
        'Wrote tabular insight agents on Jinja templates that carry full lineage and provenance, so any generated number can be traced back to source for enterprise audit',
        'Ran a fault-tolerant distributed worker fleet on AWS (ECS/SNS/SQS) with dead-letter queue handling and zero-downtime deploys',
        'Lead AI engineering for the analytics product, turning analyst workflows that were manual or simply not possible into automated ones',
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
      resume: { maxBullets: 3 },
      location: 'Remote, NY',
      duration: '2023 - 2024',
      achievements: [
        'Started the AI function from nothing and shipped its first systems to production',
        "Built the RAG pipeline behind the product's generated responses, covering retrieval, chunking, and grounding",
        'Designed the Postgres schema and backend on Supabase, including authentication and access control',
        'Architected the API layer the AI pipelines sit behind, which cut latency and raised throughput',
        'Moved infrastructure to CloudFormation and CI/CD to GitHub Actions',
        'Added monitoring across the AI pipelines to catch quality regressions before customers did',
        'Built ontological models that gave the data model a consistent vocabulary to work from',
        'Rewrote the hot query paths and indexing strategy as load grew',
        'Coordinated with external development teams on platform integration, and ran project management out of GitHub',
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
      resume: { maxBullets: 2 },
      location: 'Remote, NY',
      duration: '2022 - Present',
      achievements: [
        'Advise startups and established companies on where AI belongs in their stack, and where it does not',
        'Delivered a keynote on ChatGPT to a room of CIOs and founders',
        'Advised a blockchain unicorn on engineering process and operational flow',
        'Run technology assessments and build-versus-buy analysis for teams committing to an AI direction',
        'Led migrations to AI-integrated systems where the cost case held up',
        'Consulted on personal knowledge management systems built around LLMs',
        'Help early-stage startups choose a technology stack they will not have to abandon in a year',
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
      resume: { maxBullets: 2 },
      location: 'Singapore',
      duration: '2021 - 2022',
      achievements: [
        'Led a cross-functional engineering team, working alongside the music, research, and sales sides of the company',
        'Ran GCP infrastructure: Kubernetes and Istio, monitored with Grafana and Prometheus',
        'Rebuilt CI/CD on Jenkins with Cypress end-to-end coverage',
        'Built a custom data ingestion pipeline and automated the manual steps that had grown around it',
        'Introduced Scrum, along with the scheduling and coordination practice needed to make it stick',
        'Set technical direction against customer and partner requirements, planning releases with the founders',
        'Mentored engineers on the team and ran training sessions off the back of operational reviews',
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
      resume: { maxBullets: 3 },
      location: 'Singapore, SG',
      duration: '2018 - 2022',
      achievements: [
        'Took the product from concept to launch: a cloud platform that emulates supercomputer environments so teams can develop and test at scale without waiting for time on the real machine',
        'Raised early rounds from government, VC, and angel investors',
        'Won early customers including Fortune 500 companies and national governments',
        'Grew the team from 3 to 15 in the first year',
        'Set the business model and go-to-market strategy, with the financial model underneath it',
        'Managed relationships with several levels of government across the region',
        'Ran investor relations and board communications',
        'Negotiated the contracts with partners and suppliers',
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
        'Tested several ideas against the market and killed the ones that did not hold up',
        'Built the financial model and the go-to-market plan that came out of it',
        'Led the first fundraise',
        'Formed the early partnerships the company ran on',
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
      resume: { maxBullets: 2 },
      location: 'New York, NY',
      duration: '2016 - 2017',
      achievements: [
        'Designed and built the MVPs, then the production cloud middleware that replaced them',
        'Directed algorithm development for the core computational problems the product depended on',
        'Raised seed capital from VCs and angels',
        'Led the engineering team and set the code review and QA standards it worked to',
        'Got the company into the Grand Central Tech accelerator',
        'Worked directly with clients on what to build next',
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
      company: 'Center of Excellence in Wireless Information Technology',
      location: 'Stony Brook, NY',
      duration: '2016 - 2017',
      achievements: [
        'Designed, prototyped, and tested audio synthesizers, including the circuit design',
        'Led seminars on where music and mathematics meet',
        'Turned research into work that could actually be performed and heard',
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
        'Researched optimal wavelet bases for audio compression, searching for a general procedure rather than a one-off basis',
        'Ran a supercomputing project funded by the High Performance Computing Consortium of New York',
        'Performed real-time signal analysis on spectrum data',
        'Kept the project documentation and datasets in a state other researchers could pick up',
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
      achievements: [
        'Wrote production firmware for digital guitar pedals',
        'Shipped feature releases through a continuous integration process',
        'Built the testing protocols that brought the bug rate down',
        'Wrote the technical documentation and user manuals',
        'Fed customer feedback back into what got built next',
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
      degree: 'Doctor of Philosophy (Ph.D.), Computational Applied Mathematics',
      institution: 'Stony Brook University',
      location: 'Stony Brook, NY',
      duration: '2016 - (Incomplete)',
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
    soft: [
      'Technical Leadership',
      'Team Management',
      'Strategic Planning',
      'Business Development',
      'Client Relations',
      'Mentoring',
      'Public Speaking',
      'Problem Solving',
      'Innovation',
    ],
    languages: ['English (Native)'],
  },
};

/**
 * Derives the one-page resume from the full CV.
 *
 * `cvData` stays the single source of truth: a role appears on the resume only
 * if it carries a `resume` field, and contributes the first `maxBullets` of its
 * achievements — which is why achievements are ordered strongest-first.
 * Coursework and certifications are dropped to make the page fit.
 */
export const getResumeData = (data: CVData = cvData): CVData => ({
  ...data,
  experience: data.experience
    .filter(role => role.resume)
    .map(role => ({
      ...role,
      achievements: role.achievements.slice(0, role.resume!.maxBullets),
    })),
  education: data.education.map(
    ({ relevantCoursework: _omit, ...rest }) => rest
  ),
  certifications: [],
});

/** The one-page resume, derived from `cvData` at module load. */
export const resumeData: CVData = getResumeData();
