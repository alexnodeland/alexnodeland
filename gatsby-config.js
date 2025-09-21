/**
 * @type {import('gatsby').GatsbyConfig}
 */
module.exports = {
  pathPrefix: `/alexnodeland`,
  siteMetadata: {
    title: `Alex Nodeland`,
    description: `Experienced engineer and mathematician with a strong background in high-performance computing, AI system design, and startup development.`,
    author: `Alex Nodeland`,
    siteUrl: `https://alexnodeland.github.io/alexnodeland`,
  },
  plugins: [
    `gatsby-plugin-typescript`,
    `gatsby-plugin-sass`,
    `gatsby-plugin-image`,
    `gatsby-plugin-sharp`,
    `gatsby-transformer-sharp`,
    `gatsby-plugin-react-helmet`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `${__dirname}/src/images`,
      },
    },
  ],
}
