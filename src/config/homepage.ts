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
  };
  consulting: {
    title: string;
    description: string;
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
      'i write rust on weekends, mostly audio synthesis and probabilistic programming. the backgrounds on this site are simulations running in your browser, not video. the landscape icon in the corner opens their controls.',
    ],
  },
  consulting: {
    title: 'consulting',
    description:
      'i take on a few consulting engagements a year, and they tend to be one of two things. sometimes a team has an llm prototype that demos well and breaks in production, and wants help finding out why. in my experience the problem is rarely the model. it is usually the data model, the evals, or how failures are handled. other times a team is earlier than that, and wants a second opinion on whether ai belongs in their product before they commit to building it.',
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
          'agent orchestration, structured context, constrained generation, and evaluation loops',
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
