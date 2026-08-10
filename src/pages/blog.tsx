import React, { useState, useMemo } from 'react';
import { graphql, Link } from 'gatsby';
import { Dropdown, Layout, SEO } from '../components';
import { DropdownOption } from '../components/ui/Dropdown';
import { useScrollSpy } from '../lib/hooks';
import { BlogPageProps } from '../types';
import '../styles/blog.scss';

// Newest-first is the default, so it is the one the trigger reads on arrival.
const SORT_OPTIONS: DropdownOption[] = [
  { value: 'desc', label: 'newest first' },
  { value: 'asc', label: 'oldest first' },
];

// The tag filter's "no filter" option. A null category is what the rest of
// the page tests for; the dropdown needs a string, so this is the stand-in.
const ALL_TAGS = '__all__';

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

  // Marks whichever post is at the reading position, so the list tracks the
  // scroll the same way the expertise grid and the CV entries do.
  const { containerRef: postsRef, isActive: isPostActive } =
    useScrollSpy<HTMLDivElement>('.post-preview');

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory(null);
    setSortOrder('desc');
  };

  const hasFilters =
    Boolean(searchTerm || selectedCategory) || sortOrder !== 'desc';

  // "all" plus one option per tag the posts actually carry, so the menu can
  // never offer a filter that would empty the list.
  const tagOptions: DropdownOption[] = useMemo(
    () => [
      { value: ALL_TAGS, label: 'all' },
      ...categories.map(category => ({
        value: category,
        label: category.toLowerCase(),
      })),
    ],
    [categories]
  );

  const tagLabel =
    tagOptions.find(option => option.value === (selectedCategory ?? ALL_TAGS))
      ?.label ?? 'all';

  const sortLabel =
    SORT_OPTIONS.find(option => option.value === sortOrder)?.label ??
    'newest first';

  const hero = (
    <header className="blog-header">
      <h1>
        <Link to="/" className="hero-crumb" data-brand-anchor>
          alex
        </Link>
        <span className="hero-crumb-sep"> → </span>blog
      </h1>
      <p>notes and press, back to 2015.</p>
    </header>
  );

  return (
    <Layout hero={hero} collapsibleHero>
      <SEO title="blog" />
      <div className="blog-page">
        {/* The two pickers and the reset, loose chips sticky to the top of
            the window's scroll — the same row the CV carries. */}
        <div className="blog-control-bar">
          <Dropdown
            ariaLabel="Filter posts by tag"
            triggerLabel={tagLabel}
            options={tagOptions}
            value={selectedCategory ?? ALL_TAGS}
            onSelect={value =>
              setSelectedCategory(value === ALL_TAGS ? null : value)
            }
            className="blog-tag-dropdown"
          />

          <Dropdown
            ariaLabel="Sort posts by date"
            triggerLabel={sortLabel}
            options={SORT_OPTIONS}
            value={sortOrder}
            onSelect={value => setSortOrder(value as 'desc' | 'asc')}
            className="blog-sort-dropdown"
          />

          <button
            type="button"
            className="ui-chip-button blog-clear-chip"
            onClick={clearFilters}
            disabled={!hasFilters}
          >
            clear filters
          </button>
        </div>

        {/* Somewhere to type rather than a piece of chrome, so it keeps its
            own panel below the row. */}
        <div className="blog-search-panel">
          <input
            type="text"
            placeholder="search posts..."
            aria-label="Search posts"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
          />
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
            <div className="posts-list" ref={postsRef}>
              {filteredPosts.map((post, index) => (
                <article
                  key={post.id}
                  className={`post-preview${
                    isPostActive(index) ? ' is-active' : ''
                  }`}
                >
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
