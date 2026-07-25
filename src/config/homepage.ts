// Homepage content configuration
export interface HomepageConfig {
  hero: {
    title: string;
    subtitle: string;
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
  },
  about: {
    paragraphs: [
      'i build ai systems, mostly the parts nobody demos: agent orchestration, evaluation loops, and the semantic layer underneath that has to be right before any of it works. currently senior ai engineer at perch insights.',
      'before that i co-founded archanan in singapore and ran it as ceo for four years — we built cloud emulators of supercomputers so people could develop at scale without waiting in a queue. then led engineering at musiio, a music-ml company soundcloud later acquired. earlier still: wavelet bases for audio compression at stony brook, and firmware for guitar pedals before that.',
      'i write rust on weekends, mostly audio synthesis and probabilistic programming. the backgrounds on this site are live simulations rather than video — the gear icon opens their controls.',
    ],
  },
  consulting: {
    title: 'consulting',
    description:
      "i take on a few engagements a year. usually it's a team whose llm prototype works in a demo and falls over in production, and the fix is almost never the model — it's the data model, the evals, or the failure handling. sometimes the question is earlier than that: what to build, or whether to.",
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
          'agent orchestration, rag, tool use, and the failure modes that only appear under real traffic',
      },
      {
        icon: '⚙️',
        title: 'infrastructure',
        description:
          'aws, kubernetes, infrastructure as code, and deploy pipelines that nobody has to babysit',
      },
      {
        icon: '📊',
        title: 'data engineering',
        description:
          'pipelines, semantic models, and lineage you can actually audit after the fact',
      },
      {
        icon: '🔍',
        title: 'evaluation & observability',
        description:
          'eval sets, feedback loops, and catching a regression before a customer does',
      },
      {
        icon: '🧠',
        title: 'technical strategy',
        description:
          'architecture review, build-vs-buy, and deciding which half of the roadmap to cut',
      },
      {
        icon: '🎛️',
        title: 'creative technology',
        description:
          'audio dsp, synthesis, generative visuals — the part i would do for free anyway',
      },
    ],
  },
};
