import path from 'path';
import { fileURLToPath } from 'url';
import { siteConfig } from './src/config/site.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @type {import('gatsby').GatsbyConfig}
 */
const config = {
  pathPrefix: `/alexnodeland`,
  siteMetadata: {
    title: siteConfig.siteName,
    description: siteConfig.description,
    author: siteConfig.author,
    siteUrl: `https://alexnodeland.github.io/alexnodeland`,
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
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `${__dirname}/src/images`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `pages`,
        path: `${__dirname}/src/pages`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `blog`,
        path: `${__dirname}/src/content/blog`,
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
