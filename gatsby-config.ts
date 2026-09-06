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
        excludes: [`/404`, `/404.html`, `/dev-404-page`],
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
                const url = `${site.siteMetadata.siteUrl}/blog${node.fields.slug}`;
                return {
                  title: node.frontmatter.title,
                  description: node.frontmatter.description,
                  date: node.frontmatter.date,
                  url,
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
        // The brand mark, as a vector. The plugin cuts every PNG size from it
        // (favicon-32x32, the apple-touch-icons, the manifest set) and copies
        // the SVG itself out as /favicon.svg, then links all of them from the
        // head — so this is the one place the favicon is declared.
        icon: `src/images/favicon.svg`,
        icon_options: {
          purpose: `any maskable`,
        },
      },
    },
  ],
};

export default config;
