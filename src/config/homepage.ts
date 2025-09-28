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
    subtitle: 'systems thinker // creative technologist',
  },
  about: {
    paragraphs: [
      "i transform complex challenges into elegant solutions. whether it's orchestrating ai systems, architecting cloud infrastructure, or bridging technical and creative domains, i bring deep expertise across the full technology stack.",
      "from startup cto to ai engineering lead, i've spent years turning ambitious ideas into production-ready systems that actually deliver value. currently focused on ai engineering, devops automation, and innovative technical projects.",
      "ready to solve your toughest technical challenges? let's build something remarkable together.",
    ],
  },
  consulting: {
    title: "let's build something",
    description:
      "stuck on a complex technical challenge? from ai system architecture to strategic technology decisions, i help organizations cut through complexity and build solutions that actually work. whether you need hands-on engineering or strategic guidance, we'll turn your biggest obstacles into competitive advantages.",
    ctaButtons: {
      primary: {
        text: 'discuss your challenge',
        action: 'email',
      },
      secondary: {
        text: 'schedule a strategy call',
        action: 'calendar',
      },
    },
  },
  expertise: {
    title: 'how i can help',
    items: [
      {
        icon: '🤖',
        title: 'ai system architecture',
        description:
          'llm orchestration, rag systems, and autonomous ai agent workflows that scale',
      },
      {
        icon: '⚙️',
        title: 'cloud & devops',
        description:
          'aws, kubernetes, infrastructure as code, and reliable deployment pipelines',
      },
      {
        icon: '🧠',
        title: 'technical strategy',
        description:
          'system design, technology assessment, and strategic technical decision-making',
      },
      {
        icon: '🔧',
        title: 'full-stack engineering',
        description:
          'from databases to frontends, building complete solutions that work',
      },
      {
        icon: '🎨',
        title: 'creative technology',
        description:
          'bridging art and engineering, from audio processing to interactive systems',
      },
      {
        icon: '🚀',
        title: 'startup & product leadership',
        description:
          'from concept to launch, building teams and products that deliver real value',
      },
    ],
  },
};
