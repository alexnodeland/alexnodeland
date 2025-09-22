import React from 'react'
import { graphql, Link } from 'gatsby'
import Layout from '../components/layout'
import SEO from '../components/seo'
import '../styles/blog.scss'

interface BlogPost {
  id: string
  frontmatter: {
    title: string
    date: string
    description?: string
    category?: string
  }
  excerpt: string
  fields: {
    slug: string
  }
  parent: {
    sourceInstanceName: string
  }
}

interface BlogPageProps {
  data: {
    allMdx: {
      nodes: BlogPost[]
    }
  }
}

const BlogPage: React.FC<BlogPageProps> = ({ data }) => {
  // Filter for blog posts only
  const posts = data.allMdx.nodes.filter(
    post => post.parent && post.parent.sourceInstanceName === 'blog'
  )

  return (
    <Layout>
      <SEO title="Blog" />
      <div className="blog-page">
        <header className="blog-header">
          <h1>Blog</h1>
          <p>Thoughts on technology, projects, and the occasional deep dive into interesting problems.</p>
        </header>

        <div className="blog-content">
          {posts.length === 0 ? (
            <div className="no-posts">
              <p>No blog posts yet. Check back soon!</p>
            </div>
          ) : (
            <div className="posts-list">
              {posts.map((post) => (
                <article key={post.id} className="post-preview">
                  <div className="post-meta">
                    <time dateTime={post.frontmatter.date}>
                      {new Date(post.frontmatter.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </time>
                    {post.frontmatter.category && (
                      <span className="post-category">{post.frontmatter.category}</span>
                    )}
                  </div>
                  <h2 className="post-title">
                    <Link to={`/blog${post.fields.slug}`}>
                      {post.frontmatter.title}
                    </Link>
                  </h2>
                  {post.frontmatter.description && (
                    <p className="post-description">{post.frontmatter.description}</p>
                  )}
                  <p className="post-excerpt">{post.excerpt}</p>
                  <Link to={`/blog${post.fields.slug}`} className="read-more">
                    Read more →
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export const query = graphql`
  query BlogPageQuery {
    allMdx(
      sort: { frontmatter: { date: DESC } }
    ) {
      nodes {
        id
        frontmatter {
          title
          date
          description
          category
        }
        excerpt(pruneLength: 160)
        fields {
          slug
        }
        parent {
          ... on File {
            sourceInstanceName
          }
        }
      }
    }
  }
`

export default BlogPage
