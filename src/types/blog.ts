// Blog-related type definitions

export interface BlogPost {
  id: string;
  frontmatter: {
    title: string;
    date: string;
    description?: string;
    category?: string;
  };
  excerpt: string;
  fields: {
    slug: string;
  };
  parent: {
    sourceInstanceName: string;
  };
}

export interface BlogPageProps {
  data: {
    allMarkdownRemark: {
      nodes: BlogPost[];
    };
  };
}

export interface BlogPostProps {
  data: {
    markdownRemark: BlogPost & {
      html: string;
    };
  };
}
