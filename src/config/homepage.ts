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
  sideProjects: {
    title: string;
    description: string;
  };
  press: {
    title: string;
    links: Array<{
      text: string;
      url: string;
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
      "I've always had an innate interest in technology. I remember building my first \"guitar pedal\" when I was around 10 years old, it was a rudimentary talk box (literally held together with duct tape), but it worked! That first experience with creative technology sparked my interest.",
      "My subsequent deep dive into music technology lasted throughout my youth and university years, and ultimately lead me to the space of computational mathematics and distributed computing, specifically distributed-memory HPC. Also, having been exposed to startups at a very early age, joining one as my first job at 15 years old, I learned the importance of building scalable technical strategy, from processes to product. These paths of interest and discovery led me to where I am now.",
      "Over the course of my career, I've worked with and founded several tech startups across supercomputing and music-technology, in technical and commercial roles, and as individual contributor and manager."
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
  },
  sideProjects: {
    title: "Side Projects",
    description: "In my free time, I like to learn about a range of technologies across generative AI, creative computing, human-computer interaction, synthesizers, home automation, and hydroponics. I have a handful of personal projects that I'm working on and would like to release over time."
  },
  press: {
    title: "In the Press",
    links: [
      {
        text: "Singapore Startup Hatches At-Scale HPC Dev Cloud",
        url: "#"
      },
      {
        text: "Try Before You Buy? Test Driving a Supercomputer System",
        url: "#"
      },
      {
        text: "Supercomputing Shouldn't Be Rocket Science",
        url: "#"
      },
      {
        text: "Optimal Wavelet Bases For Audio Compression",
        url: "#"
      },
      {
        text: "Alexander Nodeland: Supercomputers For Audio Research and Development",
        url: "#"
      },
      {
        text: "The Future of Sound",
        url: "#"
      }
    ]
  }
};
