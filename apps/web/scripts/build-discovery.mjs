#!/usr/bin/env node
/**
 * The discovery files, written before every build (see package.json):
 *
 *   /llms.txt                    the site, summarised for an assistant
 *   /.well-known/security.txt    how to report a security problem (RFC 9116)
 *
 * Both come from the same config and markdown the pages render, through
 * scripts/lib/discovery.js, into static/, from where Gatsby ships them. The
 * feeds (atom.xml, feed.json) are not here: they need the posts' rendered
 * HTML, so gatsby-node writes them at the end of the build. robots.txt and
 * .well-known/tdmrep.json are hand-written in static/.
 *
 * Usage: node scripts/build-discovery.mjs [--out <dir>]   (default: static)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import matter from 'gray-matter';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Same arrangement as build-linked-data.mjs: the config is TypeScript.
require('@babel/register')({
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  cwd: ROOT,
  only: [path.join(ROOT, 'src')],
});

const {
  renderLlmsTxt,
  renderSecurityTxt,
  securityExpiry,
} = require('./lib/discovery.js');

const argv = process.argv.slice(2);
const outIndex = argv.indexOf('--out');
const OUT = path.resolve(
  ROOT,
  outIndex >= 0 && argv[outIndex + 1] ? argv[outIndex + 1] : 'static'
);

const { siteConfig } = require(path.join(ROOT, 'src/config/site.ts'));
const { homepageConfig } = require(path.join(ROOT, 'src/config/homepage.ts'));
const { projectsConfig } = require(path.join(ROOT, 'src/config/projects.ts'));
const { cvData } = require(path.join(ROOT, 'src/config/cv.ts'));
const { LD, VOCABULARY, pageUrl, postUrl } = require(
  path.join(ROOT, 'src/config/linked-data.ts')
);

const SITE = siteConfig.siteUrl;

function posts() {
  const dir = path.join(ROOT, 'src/content/blog');
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse()
    .map(file => {
      const slug = file.replace(/\.md$/, '');
      const { data } = matter(fs.readFileSync(path.join(dir, file), 'utf8'));
      return {
        title: data.title || slug,
        url: postUrl(slug),
        date:
          data.date instanceof Date
            ? data.date.toISOString().slice(0, 10)
            : String(data.date || ''),
        description: data.description || '',
        category: data.category || '',
      };
    });
}

function main() {
  const summary = renderLlmsTxt({
    name: siteConfig.siteName,
    url: SITE,
    description: siteConfig.description,
    author: siteConfig.author,
    // The homepage's own paragraphs: what a visitor reads first.
    summary: homepageConfig.about.paragraphs.join('\n\n'),
    pages: [
      {
        title: 'timeline',
        url: pageUrl('/timeline'),
        description: 'things built, played, and written about.',
      },
      {
        title: 'projects',
        url: pageUrl('/projects'),
        description: projectsConfig.subtitle,
      },
      {
        title: 'cv',
        url: pageUrl('/cv'),
        description: `${cvData.personal.title.toLowerCase()}. roles, research, and skills; also a pdf at ${SITE}/cv/alex-nodeland-cv.pdf.`,
      },
      {
        title: 'consulting',
        url: pageUrl('/consulting'),
        description: homepageConfig.consulting.description,
      },
      {
        title: 'vocab',
        url: pageUrl('/vocab'),
        description: VOCABULARY.description,
      },
    ],
    posts: posts(),
    projects: projectsConfig.projects.map(p => ({
      name: p.name,
      url: p.url,
      site: p.site,
      description: p.description,
      language: p.language,
    })),
    machine: [
      {
        title: 'graph.jsonld',
        url: LD.graphJsonLd,
        description:
          'everything the site says, as one schema.org graph: the person, every post, project, role and concept.',
      },
      {
        title: 'me.jsonld',
        url: LD.profileJsonLd,
        description: 'the profile of the person, schema.org and foaf.',
      },
      {
        title: 'vocab.jsonld',
        url: LD.vocabJsonLd,
        description: 'the skos concept scheme the site is organised by.',
      },
      {
        title: 'rss.xml',
        url: LD.feed,
        description: 'the timeline as rss; also atom.xml and feed.json.',
      },
      {
        title: 'sitemap',
        url: `${SITE}/sitemap-index.xml`,
        description: 'every page.',
      },
    ],
  });

  const security = renderSecurityTxt({
    contact: `mailto:${siteConfig.contact.email}`,
    canonical: `${SITE}/.well-known/security.txt`,
    expires: securityExpiry(),
  });

  const write = (file, content) => {
    const target = path.join(OUT, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
    return path.relative(process.cwd(), target);
  };
  const written = [
    write('llms.txt', summary),
    write(path.join('.well-known', 'security.txt'), security),
  ];
  console.log(`discovery: ${written.join(', ')}`);
}

main();
