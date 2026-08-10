import { graphql, Link } from 'gatsby';
import React from 'react';
import SEO from '../components/seo';
import '../styles/blog.scss';

interface BlogPostProps {
  data: any;
}

// A post carries its own title inside the window, so the shell wears no hero
// here — the hero region collapses to nothing and the window takes the room.
const BlogPost: React.FC<BlogPostProps> = ({ data }) => {
  const post = data.markdownRemark;

  return (
    <>
      <SEO
        title={post.frontmatter.title}
        description={post.frontmatter.description}
      />
      <div className="blog-post-page">
        <header className="post-header">
          <div className="post-meta">
            <time dateTime={post.frontmatter.date}>
              {new Date(post.frontmatter.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
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
