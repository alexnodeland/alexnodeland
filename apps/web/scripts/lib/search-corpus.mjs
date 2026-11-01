/**
 * Gathers what the site-wide search's documents are built from — the config
 * and the posts — and hands it to scripts/lib/search-docs.js, which is where
 * the documents are actually shaped (and tested).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import matter from 'gray-matter';
// Importing the chat corpus also registers babel for the TypeScript config.
import { stripMarkdown } from './chat-corpus.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);
const { buildSearchDocs: shape } = require('./search-docs.js');

export function buildSearchDocs() {
  const { cvData } = require(path.join(ROOT, 'src/config/cv.ts'));
  const { homepageConfig } = require(path.join(ROOT, 'src/config/homepage.ts'));
  const { projectsConfig, appsConfig } = require(
    path.join(ROOT, 'src/config/projects.ts')
  );
  const blogDir = path.join(ROOT, 'src/content/blog');
  const posts = fs
    .readdirSync(blogDir)
    .filter(file => file.endsWith('.md'))
    .map(file => {
      const { data, content } = matter(
        fs.readFileSync(path.join(blogDir, file), 'utf8')
      );
      return { slug: file.replace(/\.md$/, ''), data, content };
    });
  return shape({
    projectsConfig,
    appsConfig,
    homepageConfig,
    cvData,
    posts,
    stripMarkdown,
  });
}
