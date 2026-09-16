import path from 'path';
import { siteConfig } from './src/config/site';

/**
 * @type {import('gatsby').GatsbyConfig}
 */
const config: import('gatsby').GatsbyConfig = {
  pathPrefix: `/`,
  siteMetadata: {
    title: siteConfig.siteName,
    description: siteConfig.description,
    author: siteConfig.author,
    siteUrl: `https://alexnodeland.com`,
  },
  plugins: [
    `gatsby-plugin-typescript`,
    `gatsby-plugin-sass`,
    `gatsby-plugin-image`,
    `gatsby-plugin-sharp`,
    `gatsby-transformer-sharp`,
    `gatsby-plugin-react-helmet`,
    `gatsby-transformer-remark`,
    {
      resolve: `gatsby-plugin-sitemap`,
      options: {
        // Everything the site wants found; the 404 and Gatsby's dev page are
        // the only things that are not pages.
        //
        // The role-specific resumes are unlisted rather than private: they are
        // meant to be shared by address, not turned up by a search for the
        // name. They carry `noindex` as well — this keeps them out of the
        // sitemap that would invite the crawl in the first place.
        excludes: [
          `/404`,
          `/404.html`,
          `/dev-404-page`,
          `/cv/fde`,
          `/cv/ai-engineer`,
        ],
      },
    },
    {
      resolve: `gatsby-plugin-feed`,
      options: {
        query: `
          {
            site {
              siteMetadata {
                title
                description
                siteUrl
              }
            }
          }
        `,
        feeds: [
          {
            output: `/rss.xml`,
            title: `alex nodeland`,
            query: `
              {
                allMarkdownRemark(sort: { frontmatter: { date: DESC } }) {
                  nodes {
                    html
                    fields {
                      slug
                    }
                    frontmatter {
                      title
                      date
                      description
                    }
                  }
                }
              }
            `,
            serialize: ({
              query: { site, allMarkdownRemark },
            }: {
              query: {
                site: { siteMetadata: { siteUrl: string } };
                allMarkdownRemark: {
                  nodes: Array<{
                    html: string;
                    fields: { slug: string };
                    frontmatter: {
                      title: string;
                      date: string;
                      description?: string;
                    };
                  }>;
                };
              };
            }) =>
              allMarkdownRemark.nodes.map(node => {
                const url = `${site.siteMetadata.siteUrl}/timeline${node.fields.slug}`;
                return {
                  title: node.frontmatter.title,
                  description: node.frontmatter.description,
                  date: node.frontmatter.date,
                  url,
                  // The guid follows the address rather than being pinned to
                  // an older spelling of it. The move from /blog to /timeline
                  // therefore gives every item a new identity once, and a
                  // subscriber sees the back catalogue again on the deploy
                  // that carries it. Known, and accepted, rather than carried
                  // as a dead URL in the feed for good.
                  guid: url,
                  custom_elements: [{ 'content:encoded': node.html }],
                };
              }),
          },
        ],
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: path.resolve(process.cwd(), `src`, `images`),
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `pages`,
        path: path.resolve(process.cwd(), `src`, `pages`),
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `blog`,
        path: path.resolve(process.cwd(), `src`, `content`, `blog`),
      },
    },
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `Alex Nodeland`,
        short_name: `Alex Nodeland`,
        start_url: `/`,
        // --bg-primary: the site is near-black everywhere, so the splash and
        // the browser chrome should be too.
        background_color: `#0a0a0a`,
        theme_color: `#0a0a0a`,
        display: `minimal-ui`,
        // The brand mark: the face on the dark tile, square. The plugin cuts
        // every size from it (favicon-32x32, the apple-touch-icons, the
        // manifest set) and links all of them from the head — so this is the
        // one place the favicon is declared.
        icon: `src/images/favicon.png`,
        icon_options: {
          purpose: `any maskable`,
        },
      },
    },
  ],
};

export default config;
