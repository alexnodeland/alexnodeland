// Homepage content configuration
export interface HomepageConfig {
  hero: {
    title: string;
    subtitle: string;
    // The subtitle doubles as navigation: each segment links to its section
    // anchor on the projects page. Labels joined with ' → ' must reproduce
    // the subtitle string.
    subtitleLinks: { label: string; href: string }[];
  };
  about: {
    paragraphs: string[];
    /**
     * The one line the homepage still spends on consulting, now that the
     * section itself lives at /consulting/. A full sales block with a booking
     * button crowded the front page; a sentence with a link reads as something
     * someone also does.
     */
    consultingNote: {
      before: string;
      linkText: string;
      after: string;
      href: string;
    };
  };
  consulting: {
    title: string;
    /** The page's opening paragraph. Also what the chat index and the site
     * content export read, so it has to stand on its own. */
    description: string;
    /** How an engagement runs, in order. */
    steps: Array<{ title: string; body: string }>;
    /** Past engagements. No client is named: `client` describes, never names. */
    caseStudies: Array<{ title: string; client: string; body: string }>;
    /** The line just above the buttons. */
    closing: string;
    ctaButtons: {
      primary: {
        text: string;
        action: 'email' | 'calendar' | 'url';
        url?: string;
      };
      secondary: {
        text: string;
        action: 'email' | 'calendar' | 'url';
        url?: string;
      };
    };
  };
  expertise: {
    title: string;
    items: Array<{
      icon: string;
      title: string;
      description: string;
    }>;
  };
}

export const homepageConfig: HomepageConfig = {
  hero: {
    title: 'alex nodeland',
    subtitle: 'math → audio dsp → distributed systems → ai',
    subtitleLinks: [
      { label: 'math', href: '/projects#math' },
      { label: 'audio dsp', href: '/projects#audio-dsp' },
      { label: 'distributed systems', href: '/projects#distributed-systems' },
      { label: 'ai', href: '/projects#ai' },
    ],
  },
  about: {
    paragraphs: [
      'i build ai systems, mostly the infrastructure: agent orchestration, evaluation loops, and the data model everything else depends on. currently senior ai engineer at perch insights.',
      'before that i co-founded archanan in singapore and ran it as ceo for four years. we built cloud emulators of supercomputers so people could develop at scale without waiting for time on the real machine. i also led engineering at musiio, a music-ml company that soundcloud later acquired. before any of that i worked on wavelet bases for audio compression at stony brook, and wrote firmware for guitar pedals.',
      'on the weekends, i maintain the fugue and quiver ecosystems, for probabilistic programming and audio synthesis in rust. the backgrounds on this site are simulations running in your browser, not video. the landscape icon in the corner opens their controls.',
    ],
    consultingNote: {
      before: 'i also take on a few',
      linkText: 'consulting',
      after: 'engagements a year.',
      href: '/consulting/',
    },
  },
  consulting: {
    title: 'consulting',
    // Written from Alex's own sentences, turned toward past work: the page
    // leads with what the engagements were, and only its last line says new
    // ones are still possible.
    description:
      'most of the consulting i have done has been one of two things. sometimes a team had an llm prototype that demoed well and broke in production, and wanted help finding out why. in my experience the problem is rarely the model. it is usually the data model, the evals, or how failures are handled. other times a team was earlier than that, and wanted a second opinion on whether ai belonged in their product before they committed to building it. i still take on a few engagements a year.',
    steps: [
      {
        title: 'a conversation',
        body: 'it starts with an initial conversation: what is there already, and what is actually painful.',
      },
      {
        title: 'deciding what to address',
        body: 'from there we decide what to address, and how to do it in a simple proof of concept.',
      },
      {
        title: 'a quick proof of concept',
        body: 'one to two weeks. small, but built as the structured foundation the rest can be built on over time.',
      },
      {
        title: 'then, if it helps',
        body: 'optionally, further engagement: the full implementation, or advising while the implementation happens.',
      },
    ],
    // Six, so the grid lands in even rows at three columns and at two. Ordered
    // for the reader most likely to be here: the AI build work is the first
    // row, the startup, organisational and speaking work the second.
    caseStudies: [
      {
        title: 'a knowledge platform and ai copilot',
        client: 'a small management consulting firm',
        body: 'built an ontology-powered knowledge platform and ai copilot for mapping client organizations: organizing references to documentation, identifying conflicts or gaps in understanding, and synthesizing insights and reports across the documents it can access. all packaged as a web app with chat, graph visualization, task tracking and document management.',
      },
      {
        title: 'personal knowledge agents',
        client: 'non-technical individuals',
        body: 'developed personal knowledge management agents in claude code and obsidian for founders, executives, consultants and creatives. they capture and file notes into the vault, link them and keep its structure consistent, run reviews that synthesize across notes, and research and draft from what is already there. built from claude code skills and commands, hooks, mcp servers and vault conventions, then set up for each person and taught as a few plain-language commands.',
      },
      {
        title: 'llms for internal processes',
        client: 'an identity verification startup',
        body: 'they were deciding how to use llms internally, to accelerate their own processes. this was an early look at whether to self-host or use an llm api, how to maintain a living eval set that moves with expected behavior, and how to put guardrails in the workflows.',
      },
      {
        title: 'from a data model to the first demos',
        client: 'an early-stage startup',
        body: 'started as consulting: built the data model, and set them up with supabase for the database and auth, fastapi and sqlalchemy for the api, and langchain and langsmith for agents. then defined the first demo workflows.',
      },
      {
        title: 'codifying organizational process',
        client: 'a blockchain unicorn',
        body: 'as interim coo, helped codify how the organization managed its processes: raci matrices, documented processes, access controls aligned across the org, platforms locked down, and process built into internal tooling.',
      },
      {
        title: 'an llm keynote',
        client: 'an australian vc',
        body: 'a virtual keynote for about 30 cios and founders: an introduction to llm architectures and what they can do, how to protect workflows with guardrails, and how to build virtuous loops in an organization that make the most of automation and feedback.',
      },
    ],
    closing: 'if something here sounds like where your team is, get in touch.',
    ctaButtons: {
      primary: {
        text: 'send me an email',
        action: 'email',
      },
      secondary: {
        text: 'book a call',
        action: 'calendar',
      },
    },
  },
  expertise: {
    title: 'what i work on',
    items: [
      {
        icon: '🤖',
        title: 'ai systems',
        description:
          'agent orchestration, structured context, constrained generation, observability and auditability',
      },
      {
        icon: '⚙️',
        title: 'infrastructure',
        description:
          'aws, container orchestration, infrastructure as code, and ci/cd',
      },
      {
        icon: '📊',
        title: 'data engineering',
        description: 'pipelines, semantic models, and data lineage',
      },
      {
        icon: '🔍',
        title: 'evaluation & observability',
        description:
          'eval sets, feedback loops, and monitoring for regressions',
      },
      {
        icon: '🧠',
        title: 'technical strategy',
        description: 'architecture review, build-vs-buy, and roadmap planning',
      },
      {
        icon: '🎛️',
        title: 'creative technology',
        description: 'audio dsp, synthesis, and generative visuals',
      },
    ],
  },
};
