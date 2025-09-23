const path = require('path')
const { createFilePath } = require('gatsby-source-filesystem')

exports.createSchemaCustomization = ({ actions }) => {
  const { createTypes } = actions
  
  const typeDefs = `
    type MarkdownRemarkFrontmatter {
      title: String
      date: Date @dateformat
      description: String
      category: String
    }
  `
  
  createTypes(typeDefs)
}

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions
  
  // Create slug field for Markdown nodes
  if (node.internal.type === 'MarkdownRemark') {
    const value = createFilePath({ node, getNode })
    createNodeField({
      name: 'slug',
      node,
      value,
    })
  }
}

exports.createPages = async ({ graphql, actions, reporter }) => {
  const { createPage } = actions

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
  `)

  if (result.errors) {
    reporter.panicOnBuild('Error loading MarkdownRemark result', result.errors)
  }

  // Filter for blog posts and create pages
  const posts = result.data.allMarkdownRemark.nodes.filter(
    node => node.parent && node.parent.sourceInstanceName === 'blog'
  )

  const blogPostTemplate = path.resolve(`./src/templates/blog-post.tsx`)
  
  posts.forEach((node) => {
    createPage({
      path: `/blog${node.fields.slug}`,
      component: blogPostTemplate,
      context: {
        id: node.id,
      },
    })
  })
}