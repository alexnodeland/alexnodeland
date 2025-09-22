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
    title: "Alex Nodeland",
    subtitle: "Hi, I'm Alex, a freelance technical consultant with a background in distributed computing and creative technology."
  },
  about: {
    paragraphs: [
      "I'm a technical consultant with experience in distributed computing and creative technology. My background spans both technical and commercial roles across various industries.",
      "I help early-stage startups build scalable technical strategies and processes that provide immediate value without getting in the way of growth.",
      "My approach combines hands-on technical expertise with strategic thinking to solve complex problems and drive innovation."
    ]
  },
  consulting: {
    title: "Technical Consulting",
    description: "As a technical strategy consultant, I aim to bring my wide-ranging experience to early stage startups who are looking to build scalable and efficient processes that don't get in the way and provide immediate value.",
    ctaButtons: {
      primary: {
        text: "Get in Touch",
        action: "email"
      },
      secondary: {
        text: "Schedule a Call",
        action: "calendar"
      }
    }
  },
  expertise: {
    title: "Areas of Expertise",
    items: [
      {
        icon: "🚀",
        title: "Emerging Technologies",
        description: "Adoption and integration of cutting-edge AI and computing technologies"
      },
      {
        icon: "⚙️",
        title: "Technical Project Management",
        description: "Leading cross-functional teams and managing complex technical initiatives"
      },
      {
        icon: "📊",
        title: "Business Modeling",
        description: "Strategic planning and financial modeling for scalable growth"
      },
      {
        icon: "🔍",
        title: "Market Analysis",
        description: "Technical market research and competitive intelligence"
      },
      {
        icon: "🎯",
        title: "Go-to-Market Strategy",
        description: "Product launch strategies and market entry planning"
      },
      {
        icon: "🛠️",
        title: "Development Processes",
        description: "Optimizing software development workflows and practices"
      }
    ]
  }
};
