const path = require('path');
const { createFilePath } = require('gatsby-source-filesystem');

exports.createSchemaCustomization = ({ actions }) => {
  const { createTypes } = actions;

  const typeDefs = `
    type MarkdownRemarkFrontmatter {
      title: String
      date: Date @dateformat
      description: String
      category: String
    }
  `;

  createTypes(typeDefs);
};

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions;

  // Create slug field for Markdown nodes
  if (node.internal.type === 'MarkdownRemark') {
    const value = createFilePath({ node, getNode });
    createNodeField({
      name: 'slug',
      node,
      value,
    });
  }
};

exports.onCreateWebpackConfig = ({ stage, actions, plugins }) => {
  const { setWebpackConfig } = actions;

  // Exclude Transformers.js and related packages from SSR
  if (stage === 'build-html' || stage === 'develop-html') {
    setWebpackConfig({
      externals: [
        '@huggingface/transformers',
        'onnxruntime-web',
        'onnxruntime-node',
      ],
      plugins: [
        plugins.define({
          'process.env.GATSBY_CHAT_WORKER': JSON.stringify(
            process.env.GATSBY_CHAT_WORKER || 'false'
          ),
        }),
      ],
    });
  }

  // For client-side builds, ensure proper worker handling
  if (stage === 'build-javascript' || stage === 'develop') {
    setWebpackConfig({
      plugins: [
        plugins.define({
          'process.env.GATSBY_CHAT_WORKER': JSON.stringify(
            process.env.GATSBY_CHAT_WORKER || 'false'
          ),
        }),
      ],
    });
  }
};

exports.createPages = async ({ graphql, actions, reporter }) => {
  const { createPage } = actions;

  // Query for all Markdown nodes
  const result = await graphql(`
    query {
      allMarkdownRemark {
        nodes {
          id
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
  `);

  if (result.errors) {
    reporter.panicOnBuild('Error loading MarkdownRemark result', result.errors);
  }

  // Filter for blog posts and create pages
  const posts = result.data.allMarkdownRemark.nodes.filter(
    node => node.parent && node.parent.sourceInstanceName === 'blog'
  );

  const blogPostTemplate = path.resolve(`./src/templates/blog-post.tsx`);

  posts.forEach(node => {
    createPage({
      path: `/blog${node.fields.slug}`,
      component: blogPostTemplate,
      context: {
        id: node.id,
      },
    });
  });
};
