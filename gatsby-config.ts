import path from 'path';
import { siteConfig } from './src/config/site';

/**
 * @type {import('gatsby').GatsbyConfig}
 */
const config: import('gatsby').GatsbyConfig = {
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
