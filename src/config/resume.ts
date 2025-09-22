export interface ExperienceItem {
  title: string;
  company: string;
  location: string;
  duration: string;
  description?: string;
  achievements: string[];
  skills?: string[];
  highlights?: string[];
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

export interface ResumeData {
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

export const resumeData: ResumeData = {
  personal: {
    name: 'Alex Nodeland',
    title: 'Senior AI Engineer & Technical Consultant',
    email: 'alex@ournature.studio',
    location: 'Upstate, New York, USA',
    website: 'www.alexnodeland.com',
    summary: 'Experienced engineer and mathematician with a strong background in high-performance computing, AI system design, and startup development. Proven track record in leading cross-functional teams and managing strategic business partnerships. Passionate about transforming complex ideas into user-friendly solutions, optimizing business processes, and driving innovation and growth.'
  },

  experience: [
    {
      title: 'Senior AI Engineer',
      company: 'Perch Insights',
      location: 'Remote, NY',
      duration: '2024 - Present',
      achievements: [
        'Led AI engineering initiatives that transformed data analysis workflows, enabling business analysts to perform previously impossible automated insights and drastically reducing time-to-insight',
        'Architected and implemented a DAG-based workflow orchestration framework that enables autonomous AI agents to perform complex multi-step data analysis',
        'Designed a domain-specific language (DSL) that allows non-technical users to construct sophisticated analysis workflows combining LLM agents with traditional ML models',
        'Built self-improving AI systems through virtuous feedback loops that automatically capture user feedback, expand evaluation datasets, and power few-shot examples downstream',
        'Developed tabular insight generator agents using Jinja templating that maintain complete data lineage and provenance tracking, ensuring full auditability for enterprise compliance requirements',
        'Enhanced the semantic data model with ontological abstractions and higher-order business concepts, enabling automated root cause analysis and data discovery',
        'Engineered a fault-tolerant distributed worker architecture on AWS (ECS/SNS/SQS) with dead letter queue management and zero-downtime deployments'
      ],
      skills: ['Python', 'AWS', 'Docker', 'Kubernetes', 'Machine Learning', 'LLMs', 'Data Engineering']
    },
    {
      title: 'Head of AI',
      company: 'Influize',
      location: 'Remote, NY',
      duration: '2023 - 2024',
      achievements: [
        'Pioneered the AI engineering department, developing fully functional AI systems from conceptual models',
        'Developed and fully implemented RAG-based LLM systems, enhancing the product\'s capabilities in generating dynamic responses based on retrieved data',
        'Enhanced data model clarity by developing ontological models',
        'Improved database security and efficiency by designing and implementing schema and backend infrastructure using Supabase Postgres',
        'Boosted system security and functionality by building scalable AI pipelines with robust authentication',
        'Optimized AI pipeline performance by implementing monitoring systems',
        'Enhanced API throughput and reduced latency by architecting a high-performance, scalable API interface tailored for AI pipeline integrations',
        'Optimized deployment workflows and enhanced system reliability by adopting Infrastructure as Code (IaC) practices using AWS CloudFormation and setting up a robust CI/CD pipeline with GitHub Actions',
        'Ensured seamless platform integration by collaborating with external development teams',
        'Streamlined development and coordination by directing project management with GitHub\'s self-management system',
        'Boosted system responsiveness by optimizing database performance for higher scale and efficiency'
      ],
      skills: ['Python', 'PostgreSQL', 'Supabase', 'AWS', 'RAG', 'LLMs', 'Infrastructure as Code']
    },
    {
      title: 'Technical Strategy Consultant',
      company: 'Freelance',
      location: 'Remote, NY',
      duration: '2022 - Present',
      achievements: [
        'Enhanced operational flow by providing strategic guidance to a blockchain unicorn',
        'Showcased AI potential by delivering a keynote talk on ChatGPT to CIOs and founders',
        'Improved personal knowledge management systems by advising on AI and LLM utilization',
        'Developed strategic plans to keep companies at the forefront of technology',
        'Reduced costs and increased efficiency by facilitating transitions to AI-integrated systems',
        'Advanced business processes by engaging in AI research and development',
        'Identified AI solution opportunities through comprehensive market analysis',
        'Supported startups in technology selection and strategic decision-making'
      ],
      skills: ['Strategic Planning', 'AI Consulting', 'Technology Assessment', 'Business Development']
    },
    {
      title: 'Tech Lead',
      company: 'Musiio (acquired by SoundCloud)',
      location: 'Singapore',
      duration: '2021 - 2022',
      achievements: [
        'Led a cross-functional team, fostering collaboration with the music team and external partners',
        'Streamlined development workflows, managing scheduling and coordination with research and sales teams',
        'Fostered continuous improvement by conducting operational analysis and organizing training sessions',
        'Mentored team members, supporting career development and engagement',
        'Ensured effective project management by collaborating with founders on development plans',
        'Guided technical development, meeting customer and partner requirements',
        'Managed GCP infrastructure, implementing Kubernetes & Istio and monitoring with Grafana & Prometheus',
        'Revamped CI/CD process with Jenkins and Cypress, ensuring software quality',
        'Introduced agile practices (Scrum) to streamline operations and increase productivity',
        'Improved efficiency by implementing workflow automation and building a custom data ingestion pipeline'
      ],
      skills: ['Python', 'GCP', 'Kubernetes', 'Docker', 'Jenkins', 'Cypress', 'Agile', 'Team Leadership']
    },
    {
      title: 'CEO & Co-Founder',
      company: 'Archanan',
      location: 'Singapore, SG',
      duration: '2018 - 2022',
      achievements: [
        'Drove strategic direction by formulating business models and go-to-market strategies',
        'Provided critical business insights by devising dynamic financial projections',
        'Ensured seamless workflows by integrating management systems',
        'Solidified financial foundation by securing early rounds of funding from government, VC, and angel investors',
        'Expanded client base by attracting early customers, including Fortune 500 companies and national governments',
        'Brought products to market by spearheading product development from conceptualization to launch',
        'Fostered rapid growth by expanding the team from 3 to 15 in the first year',
        'Strengthened partnerships by managing diplomatic relations with multiple levels of government',
        'Promoted customer loyalty by establishing a strong brand identity',
        'Secured beneficial terms by negotiating contracts and agreements with partners and suppliers',
        'Mitigated business risks by implementing risk management strategies',
        'Maintained transparency by steering investor relations and board communications',
        'Challenged traditional norms by leveraging technical background to drive innovative solutions'
      ],
      skills: ['Leadership', 'Business Strategy', 'Fundraising', 'Product Management', 'Team Building']
    },
    {
      title: 'Founder in Residence',
      company: 'Entrepreneur First',
      location: 'Singapore, SG',
      duration: 'Jan 2018 - Jun 2018',
      achievements: [
        'Optimized market fit by refining early-stage ideas',
        'Validated business concepts through comprehensive market research',
        'Catalyzed product development by securing early LOIs and bringing MVPs to fruition',
        'Drove business growth by formulating and implementing go-to-market strategies',
        'Provided key insights through financial modeling to plan and predict business performance',
        'Initiated a successful venture by co-founding Archanan',
        'Secured seed capital by leading fundraising efforts',
        'Broadened network and resources by forming strategic partnerships',
        'Strengthened market positioning through business development initiatives'
      ],
      skills: ['Entrepreneurship', 'Market Research', 'Financial Modeling', 'Business Development']
    },
    {
      title: 'CTO, Chief Mathematician',
      company: 'Scala Computing',
      location: 'New York, NY',
      duration: '2016 - 2017',
      achievements: [
        'Drove financial stability by securing seed capital from prominent VCs and angels',
        'Elevated company status by gaining membership to the Grand Central Tech Accelerator',
        'Fast-tracked product development by designing, architecting, and implementing MVPs',
        'Ensured reliable software solutions by developing, testing, and integrating production code',
        'Enhanced productivity and collaboration by establishing robust development processes',
        'Improved software performance by leading a team of developers in delivering cloud middleware solutions',
        'Advanced technological capabilities by directing algorithm development for complex problems',
        'Ensured software quality by establishing strict QA standards',
        'Minimized bugs through efficient code review practices',
        'Enhanced client service offerings by cultivating strong client relationships'
      ],
      skills: ['Mathematics', 'Software Development', 'Team Leadership', 'Algorithm Design', 'Cloud Computing']
    },
    {
      title: 'Artist in Residence',
      company: 'Center of Excellence in Wireless Information Technology',
      location: 'Stony Brook, NY',
      duration: '2016 - 2017',
      achievements: [
        'Pioneered sound technology by designing, prototyping, and testing audio synthesizers',
        'Contributed to novel audio technologies by engineering unique circuit designs',
        'Generated creative content using academic research',
        'Demystified complex concepts through collaboration with music technology industry professionals',
        'Inspired creativity by leading seminars on the intersection of music and mathematics',
        'Facilitated collaborative opportunities by networking with industry professionals'
      ],
      skills: ['Audio Engineering', 'Circuit Design', 'Music Technology', 'Research', 'Creative Technology']
    },
    {
      title: 'Researcher',
      company: 'SUNY Research Foundation',
      location: 'Stony Brook, NY',
      duration: '2016 - 2017',
      achievements: [
        'Boosted research capabilities by spearheading a supercomputing project funded by the High Performance Computing Consortium of New York',
        'Contributed to advancements in audio technology by conducting in-depth research on optimal wavelet bases for audio compression',
        'Provided insights into spectrum trends by performing real-time signal analysis',
        'Ensured up-to-date practices by liaising with other research teams',
        'Maintained reliable data sources by organizing and maintaining project documentation'
      ],
      skills: ['Research', 'Signal Processing', 'Supercomputing', 'Data Analysis', 'Academic Writing']
    },
    {
      title: 'Assistant Product Engineer',
      company: 'Absara Audio',
      location: 'Port Jefferson, NY',
      duration: '2014 - 2015',
      achievements: [
        'Enhanced product functionality by developing production-grade firmware for digital guitar pedals',
        'Ensured regular product improvements by contributing to continuous integration and feature releases',
        'Simplified customer usage by authoring technical documentation and user manuals',
        'Improved product quality by optimizing processes to reduce software bugs',
        'Integrated customer feedback into product development',
        'Ensured software quality by implementing rigorous testing protocols'
      ],
      skills: ['Firmware Development', 'Embedded Systems', 'Technical Writing', 'Product Development']
    },
    {
      title: 'Technician',
      company: 'Absara Audio',
      location: 'Port Jefferson, NY',
      duration: '2010 - 2014',
      achievements: [
        'Contributed to product manufacturing by assembling printed circuit boards for audio processing units',
        'Guaranteed product reliability by conducting rigorous hardware testing',
        'Ensured customer satisfaction by managing servicing of customer hardware',
        'Maintained high service standards by leading technical customer service efforts',
        'Optimized production processes through continuous improvement initiatives',
        'Ensured quality standards by providing training to new staff',
        'Contributed to customer service excellence by handling returns and repairs'
      ],
      skills: ['Hardware Assembly', 'Quality Control', 'Customer Service', 'Technical Support']
    }
  ],

  education: [
    {
      degree: 'Doctor of Philosophy (Ph.D.), Computational Applied Mathematics',
      institution: 'Stony Brook University',
      location: 'Stony Brook, NY',
      duration: '2016 - (Incomplete)',
      description: 'Engaged in preliminary research but transitioned to entrepreneurial roles prior to advancing to candidacy.',
      relevantCoursework: [
        'Numerical Analysis',
        'Numerical Partial Differential Equations', 
        'Numerical Linear Algebra',
        'Data Analysis',
        'Applied Real Analysis',
        'Applied Complex Analysis',
        'Parallel Computing'
      ],
      achievements: [
        'Applied research experience at the Center of Excellence in Wireless Information Technology (CEWIT) and SUNY Research Foundation, focusing on audio compression and signal analysis'
      ]
    },
    {
      degree: 'Bachelor\'s Degree (BS), Applied Mathematics and Statistics',
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
        'Molecular and Organic Chemistry'
      ],
      achievements: [
        'Member of the University Scholars Program'
      ]
    }
  ],

  certifications: [
    {
      name: 'AWS Business Professional',
      issuer: 'Amazon Web Services',
      date: '2018'
    },
    {
      name: 'AWS TCO and Cloud Economics',
      issuer: 'Amazon Web Services', 
      date: '2018'
    },
    {
      name: 'Responsible Conduct of Research in Engineering',
      issuer: 'CITI Program',
      date: '2017'
    }
  ],

  skills: {
    technical: [
      'Python', 'JavaScript/TypeScript', 'React', 'Node.js', 'AWS', 'GCP', 'Docker', 'Kubernetes',
      'PostgreSQL', 'Machine Learning', 'LLMs', 'RAG Systems', 'Data Engineering', 'API Development',
      'Infrastructure as Code', 'CI/CD', 'Agile/Scrum', 'Git', 'Linux', 'Mathematics', 'Signal Processing'
    ],
    soft: [
      'Technical Leadership', 'Team Management', 'Strategic Planning', 'Business Development',
      'Client Relations', 'Mentoring', 'Public Speaking', 'Problem Solving', 'Innovation'
    ],
    languages: ['English (Native)']
  }
};
