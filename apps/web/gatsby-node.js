const path = require('path');
const fs = require('fs');
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

/**
 * The page that used to be at a /blog address, and where it lives now. Filled
 * by createPages and spent by onPostBuild, both in the same process.
 *
 * The list moved to /timeline and the posts moved with it. GitHub Pages serves
 * files and nothing else — there is no server to answer an old address with a
 * 301 — so every one of them keeps a page of its own that points at the new
 * one. Seven years of links, the feed's old item URLs and anything anyone
 * bookmarked all still land.
 */
const redirects = new Map();

/**
 * A page whose whole job is to leave. The refresh is what moves a browser,
 * the canonical is what tells a crawler which address is the real one, and
 * the anchor is what is left for anyone the first two do not reach.
 */
const SITE_URL = 'https://alexnodeland.com';

const redirectPage = destination => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>moved to ${destination}</title>
    <link rel="canonical" href="${SITE_URL}${destination}" />
    <meta name="robots" content="noindex, follow" />
    <meta http-equiv="refresh" content="0; url=${destination}" />
  </head>
  <body>
    <p>this page moved to <a href="${destination}">${destination}</a>.</p>
  </body>
</html>
`;

exports.createPages = async ({ graphql, actions, reporter }) => {
  const { createPage } = actions;

  // Query for all Markdown nodes
  const result = await graphql(`
    query {
      allMarkdownRemark {
        nodes {
          id
          frontmatter {
            date
          }
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

  const postTemplate = path.resolve(`./src/templates/timeline-post.tsx`);

  // Oldest first, so a post's neighbours are the two entries either side of it
  // on the timeline. The reader can sort the list itself, but the way from one
  // post to the next is chronology: it is built here, once, and is the same
  // whichever way the list they came from happened to be pointing. The slug
  // breaks ties, so two posts sharing a date still have a settled order.
  const inOrder = [...posts].sort((a, b) => {
    const dateA = new Date(a.frontmatter.date).getTime();
    const dateB = new Date(b.frontmatter.date).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return a.fields.slug.localeCompare(b.fields.slug);
  });

  inOrder.forEach((node, index) => {
    const older = inOrder[index - 1];
    const newer = inOrder[index + 1];
    createPage({
      path: `/timeline${node.fields.slug}`,
      component: postTemplate,
      context: {
        id: node.id,
        // Null at the ends of the run, which the template reads as "no
        // neighbour this way" — the query returns nothing for an id of null.
        olderId: older ? older.id : null,
        newerId: newer ? newer.id : null,
      },
    });
    redirects.set(`/blog${node.fields.slug}`, `/timeline${node.fields.slug}`);
  });

  redirects.set('/blog/', '/timeline/');
};

// Copy .nojekyll file to public directory for GitHub Pages
exports.onPostBuild = () => {
  const srcPath = path.join(__dirname, '.nojekyll');
  const destPath = path.join(__dirname, 'public', '.nojekyll');

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(
      '✅ .nojekyll file copied to public directory for GitHub Pages'
    );
  }

  for (const [from, to] of redirects) {
    const dir = path.join(__dirname, 'public', from.replace(/^\/+|\/+$/g, ''));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), redirectPage(to));
  }
  if (redirects.size) {
    console.log(`✅ ${redirects.size} /blog addresses point at /timeline`);
  }
};
