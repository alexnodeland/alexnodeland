const path = require('path')
const { createFilePath } = require('gatsby-source-filesystem')

exports.createSchemaCustomization = ({ actions }) => {
  const { createTypes } = actions
  
  const typeDefs = `
    type MdxFrontmatter {
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
  
  // Create slug field for MDX nodes
  if (node.internal.type === 'Mdx') {
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

  // Query for all MDX nodes
  const result = await graphql(`
    query {
      allMdx {
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
          internal {
            contentFilePath
          }
        }
      }
    }
  `)

  if (result.errors) {
    reporter.panicOnBuild('Error loading MDX result', result.errors)
  }

  // Filter for blog posts and create pages
  const posts = result.data.allMdx.nodes.filter(
    node => node.parent && node.parent.sourceInstanceName === 'blog'
  )

  const blogPostTemplate = path.resolve(`./src/templates/blog-post.tsx`)
  
  posts.forEach((node) => {
    createPage({
      path: `/blog${node.fields.slug}`,
      component: `${blogPostTemplate}?__contentFilePath=${node.internal.contentFilePath}`,
      context: {
        id: node.id,
      },
    })
  })
}