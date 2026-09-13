import { graphql, Link } from 'gatsby';
import React, { useEffect } from 'react';
import SEO from '../components/seo';
import { DownloadIcon } from '../components/ui/EntryIcons';
import ShareRow from '../components/ui/ShareRow';
import { getFullUrl } from '../config/helpers';
import { rememberPost } from '../lib/timelineView';
import { formatDate } from '../lib/utils/dates';
import '../styles/timeline.scss';

interface Neighbour {
  frontmatter: { title: string };
  fields: { slug: string };
}

interface BlogPostProps {
  data: {
    markdownRemark: any;
    older: Neighbour | null;
    newer: Neighbour | null;
  };
  location?: { pathname?: string };
}

// A post carries its own title inside the window, so the shell wears no hero
// here — the hero region collapses to nothing and the window takes the room.
const BlogPost: React.FC<BlogPostProps> = ({ data, location }) => {
  const post = data.markdownRemark;
  const { older, newer } = data;
  const url = getFullUrl(location?.pathname ?? `/timeline${post.fields.slug}`);

  // The timeline remembers where the reader got to, and this is what tells it.
  // The post says so itself rather than the card that was clicked: a reader who
  // walks the older/newer row below should come back to where they stopped,
  // and one who arrived from a search engine should be put somewhere sensible
  // by the link back to the list.
  useEffect(() => {
    rememberPost(post.fields.slug);
  }, [post.fields.slug]);

  return (
    <>
      <SEO
        title={post.frontmatter.title}
        description={post.frontmatter.description}
        pathname={location?.pathname}
      />
      <div className="post-page">
        {/* The way back, above the title card rather than inside it. In the
            meta voice rather than as a link in the page's own green: the
            capsule in the corner and the row at the foot are the two loud ways
            out, and a third one shouting over the title would be the loudest
            thing on the page. Outside the card it reads as what it is — the
            page's own breadcrumb, on the column's left edge, above the piece
            rather than part of it. */}
        <Link to="/timeline" className="post-return">
          ← timeline
        </Link>
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

        {/* The article is one card: the prose, and under it the band that says
            what can be done with it — the same title-body-meta grammar every
            card on the site is built to, so the piece ends inside its own
            outline rather than trailing off into loose chrome. */}
        <article className="post-article">
          <div
            className="post-content"
            dangerouslySetInnerHTML={{ __html: post.html }}
          />
          <div className="post-actions">
            <ShareRow url={url} title={post.frontmatter.title} />
            {/* Typeset by LaTeX at build time, like the CV's — see
                scripts/build-post-pdfs.js. A plain anchor at a static file,
                not a router link, wearing the site's one download mark. */}
            <a
              className="ui-chip-button ui-icon-chip post-download"
              href={`/timeline/pdf/${post.fields.slug.replace(/\//g, '')}.pdf`}
              download
              aria-label="download this post as a pdf"
              title="pdf"
            >
              <DownloadIcon />
            </a>
          </div>
        </article>

        {/* The way on, and the way out, on one line: the post before this one
            in time, the list, and the post after it. No rule above it — the
            article's own outline has already closed — and the row sits on the
            middle line between that outline and the footer's first mark. */}
        <nav className="post-nav" aria-label="more posts">
          {older ? (
            <Link
              to={`/timeline${older.fields.slug}`}
              className="post-nav-link post-nav-older"
              rel="prev"
            >
              <span className="post-nav-arrow" aria-hidden="true">
                ←
              </span>
              <span className="post-nav-title">{older.frontmatter.title}</span>
            </Link>
          ) : (
            <span className="post-nav-link is-empty" aria-hidden="true" />
          )}

          <Link to="/timeline" className="back-to-timeline">
            timeline
          </Link>

          {newer ? (
            <Link
              to={`/timeline${newer.fields.slug}`}
              className="post-nav-link post-nav-newer"
              rel="next"
            >
              <span className="post-nav-title">{newer.frontmatter.title}</span>
              <span className="post-nav-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          ) : (
            <span className="post-nav-link is-empty" aria-hidden="true" />
          )}
        </nav>
      </div>
    </>
  );
};

// The two neighbours are resolved by id rather than looked up by date here:
// gatsby-node walks the posts in order once and hands each page the ids either
// side of it (see createPages). An id of null matches nothing, which is what
// the ends of the run come back as.
export const query = graphql`
  query BlogPostQuery($id: String!, $olderId: String, $newerId: String) {
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
    older: markdownRemark(id: { eq: $olderId }) {
      frontmatter {
        title
      }
      fields {
        slug
      }
    }
    newer: markdownRemark(id: { eq: $newerId }) {
      frontmatter {
        title
      }
      fields {
        slug
      }
    }
  }
`;

export default BlogPost;
