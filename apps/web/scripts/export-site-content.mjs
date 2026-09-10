#!/usr/bin/env node
/**
 * Exports every piece of content on the site to one JSON snapshot, for the
 * model app in `apps/model` to derive its training corpus from.
 *
 * The two apps share no code: the site is TypeScript and markdown, the
 * fine-tuning pipeline is Python. This file is the seam. It reads the same
 * sources the site renders — the site, homepage, CV and project configs, and
 * the blog markdown — and writes them out as plain data, so that "the corpus
 * is up to date" reduces to "this snapshot is up to date", and that is one
 * command with no judgement in it.
 *
 * Deliberately deterministic: no timestamps, no environment, stable key and
 * item order. The model app hashes the bytes of this file to decide whether
 * the content has changed since the last published model, so two exports of
 * the same site must be byte-identical.
 *
 * Usage: node scripts/export-site-content.mjs [--out <path>]
 *        (default: ../model/data/site-content.json)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import matter from 'gray-matter';
import { stripMarkdown, packParagraphs } from './lib/chat-corpus.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Bumped when the shape of the snapshot changes in a way the model app has
 *  to know about. The app refuses a snapshot it does not understand. */
const SCHEMA = 1;

const argv = process.argv.slice(2);
const outIndex = argv.indexOf('--out');
const OUT = path.resolve(
  ROOT,
  outIndex >= 0 && argv[outIndex + 1]
    ? argv[outIndex + 1]
    : path.join('..', 'model', 'data', 'site-content.json')
);

/** Paragraph packing target. Shorter than the chat's 900: an extraction
 *  example has to fit the model's 256-token training bucket together with
 *  its schema, and ~500 characters of prose is about 130 tokens. */
const PARAGRAPH_CHARS = 500;

function posts(blogDir) {
  return fs
    .readdirSync(blogDir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .map(file => {
      const slug = file.replace(/\.md$/, '');
      const raw = fs.readFileSync(path.join(blogDir, file), 'utf8');
      const { data, content } = matter(raw);
      const body = stripMarkdown(content);
      return {
        slug,
        url: `/blog/${slug}`,
        title: data.title || slug,
        // gray-matter parses an unquoted date as a Date; the posts quote
        // theirs, but normalise anyway so the snapshot never depends on it.
        date:
          data.date instanceof Date
            ? data.date.toISOString().slice(0, 10)
            : String(data.date || ''),
        description: data.description || '',
        category: data.category || '',
        wordCount: body.split(/\s+/).filter(Boolean).length,
        paragraphs: packParagraphs(body, PARAGRAPH_CHARS),
      };
    });
}

function main() {
  const { siteConfig } = require(path.join(ROOT, 'src/config/site.ts'));
  const { homepageConfig } = require(path.join(ROOT, 'src/config/homepage.ts'));
  const { cvData } = require(path.join(ROOT, 'src/config/cv.ts'));
  const { projectsConfig } = require(path.join(ROOT, 'src/config/projects.ts'));
  const { chatConfig } = require(path.join(ROOT, 'src/config/chat.ts'));

  const snapshot = {
    schema: SCHEMA,
    site: {
      name: siteConfig.siteName,
      url: siteConfig.siteUrl,
      description: siteConfig.description,
      author: siteConfig.author,
      contact: siteConfig.contact,
      social: siteConfig.social,
      services: siteConfig.services,
      navigation: siteConfig.navigation.main,
    },
    homepage: {
      hero: {
        title: homepageConfig.hero.title,
        subtitle: homepageConfig.hero.subtitle,
      },
      about: homepageConfig.about.paragraphs,
      consulting: {
        title: homepageConfig.consulting.title,
        description: homepageConfig.consulting.description,
      },
      expertise: homepageConfig.expertise.items.map(
        ({ title, description }) => ({
          title,
          description,
        })
      ),
    },
    cv: {
      personal: cvData.personal,
      experience: cvData.experience.map(e => ({
        title: e.title,
        company: e.company,
        location: e.location,
        duration: e.duration,
        description: e.description || '',
        achievements: e.achievements,
        skills: e.skills || [],
      })),
      education: cvData.education.map(e => ({
        degree: e.degree,
        institution: e.institution,
        location: e.location,
        duration: e.duration,
        description: e.description || '',
        coursework: e.relevantCoursework || [],
        achievements: e.achievements || [],
      })),
      certifications: cvData.certifications,
      skills: cvData.skills,
    },
    projects: {
      subtitle: projectsConfig.subtitle,
      categories: projectsConfig.categories,
      projects: projectsConfig.projects.map(p => ({
        name: p.name,
        description: p.description,
        language: p.language,
        tags: p.tags,
        url: p.url,
        site: p.site || '',
        stars: typeof p.stars === 'number' ? p.stars : 0,
        category: p.category,
      })),
    },
    posts: posts(path.join(ROOT, 'src/content/blog')),
    chat: {
      // Real visitor-shaped questions; the model app seeds its evaluation
      // set with them so the graded questions are ones the site actually
      // suggests.
      samplePrompts: chatConfig.interface.samplePrompts,
    },
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + '\n');

  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log(
    `content: ${snapshot.cv.experience.length} roles, ${snapshot.cv.education.length} degrees, ` +
      `${snapshot.projects.projects.length} projects, ${snapshot.posts.length} posts ` +
      `(${snapshot.posts.reduce((n, p) => n + p.paragraphs.length, 0)} paragraphs) → ` +
      `${path.relative(process.cwd(), OUT)} (${kb}KB)`
  );
}

main();
