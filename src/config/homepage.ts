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
    subtitle: 'ai engineering & devops specialist',
  },
  about: {
    paragraphs: [
      'i build ai systems that actually work. from llm orchestration to distributed workflows, i solve complex engineering challenges with production-ready solutions.',
      "ready to transform your ai initiatives into scalable, reliable systems? let's architect something powerful together.",
      'specializing in python, aws, kubernetes, and the full ai engineering stack that powers modern intelligent applications.',
    ],
  },
  consulting: {
    title: "let's build something",
    description:
      'stop struggling with ai system complexity and scaling challenges. i help companies implement robust, production-ready ai infrastructure that delivers real business value.',
    ctaButtons: {
      primary: {
        text: 'start building',
        action: 'email',
      },
      secondary: {
        text: 'explore possibilities',
        action: 'calendar',
      },
    },
  },
  expertise: {
    title: 'core capabilities',
    items: [
      {
        icon: '🤖',
        title: 'ai system architecture',
        description:
          'llm orchestration, rag systems, and autonomous ai agent workflows',
      },
      {
        icon: '⚙️',
        title: 'devops & infrastructure',
        description: 'aws, kubernetes, docker, and infrastructure as code',
      },
      {
        icon: '📊',
        title: 'data engineering',
        description:
          'pipeline design, etl processes, and data lineage tracking',
      },
      {
        icon: '🔧',
        title: 'mlops & monitoring',
        description:
          'model deployment, monitoring, and continuous improvement systems',
      },
      {
        icon: '🚀',
        title: 'technical leadership',
        description:
          'cross-functional teams, strategic planning, and technical consulting',
      },
      {
        icon: '💡',
        title: 'ai product development',
        description:
          'from mvp to production, building ai products that users love',
      },
    ],
  },
};
