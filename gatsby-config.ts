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
        background_color: `#ffffff`,
        theme_color: `#333333`,
        display: `minimal-ui`,
        icon: `src/images/icon.png`,
        icon_options: {
          purpose: `any maskable`,
        },
      },
    },
  ],
};

export default config;
