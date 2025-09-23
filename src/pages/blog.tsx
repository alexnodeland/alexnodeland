import React, { useState, useMemo } from 'react';
import { graphql, Link } from 'gatsby';
import { Layout, SEO } from '../components';
import { BlogPageProps } from '../types';
import '../styles/blog.scss';

const BlogPage: React.FC<BlogPageProps> = ({ data }) => {
  // Filter for blog posts only
  const allPosts = data.allMarkdownRemark.nodes.filter(
    post => post.parent && post.parent.sourceInstanceName === 'blog'
  );

  // State for search, filtering, and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Get unique categories
  const categories = useMemo(() => {
    const cats = allPosts
      .map(post => post.frontmatter.category)
      .filter((cat): cat is string => Boolean(cat))
      .filter((cat, index, arr) => arr.indexOf(cat) === index);
    return cats;
  }, [allPosts]);

  // Filter and sort posts based on search term, category, and sort order
  const filteredPosts = useMemo(() => {
    const filtered = allPosts.filter(post => {
      const matchesSearch =
        searchTerm === '' ||
        post.frontmatter.title
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        post.frontmatter.description
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === null ||
        post.frontmatter.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    // Sort by date
    return filtered.sort((a, b) => {
      const dateA = new Date(a.frontmatter.date).getTime();
      const dateB = new Date(b.frontmatter.date).getTime();

      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [allPosts, searchTerm, selectedCategory, sortOrder]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory(null);
    setSortOrder('desc');
  };

  return (
    <Layout>
      <SEO title="Blog" />
      <div className="blog-page">
        <header className="blog-header">
          <h1>blog</h1>
          <p>
            thoughts on technology, projects, and the occasional deep dive into
            interesting problems.
          </p>
        </header>

        {/* Search and Filter Controls */}
        <div className="blog-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="search posts..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-container">
            <div className="category-filters">
              <button
                className={`filter-btn ${selectedCategory === null ? 'active' : ''}`}
                onClick={() => setSelectedCategory(null)}
              >
                all
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category.toLowerCase()}
                </button>
              ))}
            </div>

            <div className="sort-container">
              <label htmlFor="sort-select" className="sort-label">
                sort by date:
              </label>
              <select
                id="sort-select"
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as 'desc' | 'asc')}
                className="sort-select"
              >
                <option value="desc">newest first</option>
                <option value="asc">oldest first</option>
              </select>
            </div>

            <button
              className={`clear-filters-btn ${searchTerm || selectedCategory || sortOrder !== 'desc' ? 'active' : 'disabled'}`}
              onClick={clearFilters}
              disabled={
                !(searchTerm || selectedCategory || sortOrder !== 'desc')
              }
            >
              clear filters
            </button>
          </div>
        </div>

        <div className="blog-content">
          {filteredPosts.length === 0 ? (
            <div className="no-posts">
              <p>
                {allPosts.length === 0
                  ? 'no blog posts yet. check back soon!'
                  : 'no posts match your current filters. try adjusting your search or category selection.'}
              </p>
            </div>
          ) : (
            <div className="posts-list">
              {filteredPosts.map(post => (
                <article key={post.id} className="post-preview">
                  <div className="post-meta">
                    <time dateTime={post.frontmatter.date}>
                      {new Date(post.frontmatter.date).toLocaleDateString(
                        'en-US',
                        {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }
                      )}
                    </time>
                    {post.frontmatter.category && (
                      <span className="post-category">
                        {post.frontmatter.category}
                      </span>
                    )}
                  </div>
                  <h2 className="post-title">
                    <Link to={`/blog${post.fields.slug}`}>
                      {post.frontmatter.title}
                    </Link>
                  </h2>
                  {post.frontmatter.description && (
                    <p className="post-description">
                      {post.frontmatter.description}
                    </p>
                  )}
                  <p className="post-excerpt">{post.excerpt}</p>
                  <Link to={`/blog${post.fields.slug}`} className="read-more">
                    read more →
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export const query = graphql`
  query BlogPageQuery {
    allMarkdownRemark(sort: { frontmatter: { date: DESC } }) {
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
`;

export default BlogPage;
