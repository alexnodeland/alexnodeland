import { graphql, Link } from 'gatsby';
import React from 'react';
import SEO from '../components/seo';
import { formatDate } from '../lib/utils/dates';
import '../styles/blog.scss';

interface BlogPostProps {
  data: any;
  location?: { pathname?: string };
}

// A post carries its own title inside the window, so the shell wears no hero
// here — the hero region collapses to nothing and the window takes the room.
const BlogPost: React.FC<BlogPostProps> = ({ data, location }) => {
  const post = data.markdownRemark;

  return (
    <>
      <SEO
        title={post.frontmatter.title}
        description={post.frontmatter.description}
        pathname={location?.pathname}
      />
      <div className="blog-post-page">
        <header className="post-header">
          <div className="post-meta">
            <time dateTime={post.frontmatter.date}>
              {formatDate(post.frontmatter.date)}
            </time>
            {post.frontmatter.category && (
              <span className="post-category">{post.frontmatter.category}</span>
            )}
          </div>
          <h1 className="post-title">{post.frontmatter.title}</h1>
          {post.frontmatter.description && (
            <p className="post-description">{post.frontmatter.description}</p>
          )}
        </header>

        <div
          className="post-content"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />

        <footer className="post-footer">
          <Link to="/blog" className="back-to-blog">
            ← back to blog
          </Link>
        </footer>
      </div>
    </>
  );
};

export const query = graphql`
  query BlogPostQuery($id: String!) {
    markdownRemark(id: { eq: $id }) {
      id
      html
      frontmatter {
        title
        date
        description
        category
      }
      fields {
        slug
      }
    }
  }
`;

export default BlogPost;
