/**
 * Builds the retrieval corpus for the in-browser chat.
 *
 * Every passage the chatbot can ever cite is produced here, from the same
 * sources the site itself renders: the CV config, the homepage config, the
 * projects config, and the blog markdown. There is no separate hand-written
 * knowledge base to drift out of sync — edit the site, rebuild the index.
 *
 * Chunks are *self-contained*: each one opens with a sentence naming what it
 * is ("Alex's role: ...", "Blog post \"...\""). That header is what makes a
 * 384-dimension embedding of a mid-article paragraph still land near the query
 * "what did Alex write about wavelets", and it is also what lets a 350M model
 * answer from a bare passage without the surrounding document.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import matter from 'gray-matter';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

require('@babel/register')({
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  cwd: ROOT,
  only: [path.join(ROOT, 'src')],
});

/** Markdown → plain prose. Retrieval scores punctuation as noise, and a 350M
 *  model reading a passage does better without link syntax in the way. */
function stripMarkdown(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ') // fenced code
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → label
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/^\s*>\s?/gm, '') // blockquotes
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1') // emphasis
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Packs paragraphs into passages of roughly `target` characters, never
 * splitting a paragraph. Oversized paragraphs are broken on sentence
 * boundaries so a single wall-of-text paragraph can't blow the context budget.
 */
function packParagraphs(text, target = 900) {
  const paras = text
    .split(/\n{2,}/)
    .map(p => p.replace(/\n/g, ' ').trim())
    .filter(Boolean);

  const units = [];
  for (const p of paras) {
    if (p.length <= target * 1.6) {
      units.push(p);
      continue;
    }
    let buf = '';
    for (const sentence of p.split(/(?<=[.!?])\s+/)) {
      if (buf && buf.length + sentence.length > target) {
        units.push(buf.trim());
        buf = '';
      }
      buf += `${sentence} `;
    }
    if (buf.trim()) units.push(buf.trim());
  }

  const packed = [];
  let buf = '';
  for (const u of units) {
    if (buf && buf.length + u.length > target) {
      packed.push(buf.trim());
      buf = '';
    }
    buf += `${u}\n\n`;
  }
  if (buf.trim()) packed.push(buf.trim());
  return packed;
}

function cvChunks(cvData) {
  const out = [];
  const url = '/cv';
  const { personal, experience, education, certifications, skills } = cvData;

  // Pinned passages are in context regardless of what retrieval returns —
  // "who is this", "what does he do now" and "before that?" are the most
  // common questions by a wide margin, and the ones where a wrong retrieval is
  // most embarrassing. Two tiers, because the placement is a real trade:
  //
  //   pin: 1  folded into the system prompt, which is byte-identical every
  //           turn and therefore covered by the KV cache — free after the
  //           first prefill, but far from the question;
  //   pin: 2  rendered immediately above the question, where a small model
  //           reads hardest — but re-prefilled every turn, so it must be tiny.
  out.push({
    id: 'cv:identity',
    kind: 'cv',
    title: 'Who Alex is',
    url,
    pin: 1,
    text: `${personal.name} — ${personal.title}, based in ${personal.location}. Website ${personal.website}, email ${personal.email}.\n${personal.summary}`,
  });

  const timeline = experience
    .map(
      (e, i) =>
        `${i + 1}. ${e.duration} — ${e.title}, ${e.company}${i === 0 ? ' (current role)' : ''}`
    )
    .join('\n');

  // "Where did he work before X?" is asked constantly, and a 1.2B model
  // reading an ordered list gets it wrong often enough to matter — it picks a
  // company that is merely *nearby* in the list. Stating each adjacency
  // outright turns the inference into a lookup, keyed on whichever company the
  // visitor named. Three details, each of which was needed:
  //
  //   - "before X: Y" rather than prose, so the key is at the start of a line;
  //   - the five most recent only, because this chunk is in every prompt and
  //     the full twelve-entry list ran to 1,900 characters, starving retrieval;
  //   - no durations, which are in the numbered list directly above.
  const TRANSITIONS_SHOWN = 5;
  const transitions = experience
    .slice(1, TRANSITIONS_SHOWN + 1)
    .map((e, i) => `- before ${experience[i].company}: ${e.company}`)
    .reverse()
    .join('\n');

  out.push({
    id: 'cv:timeline',
    kind: 'cv',
    title: "Alex's career timeline",
    url,
    pin: 1,
    text:
      `Alex's career timeline, most recent first:\n${timeline}\n\n` +
      `Which company came before which:\n${transitions}`,
  });

  // pin: 2 — rendered immediately above the question rather than folded into
  // the cached system prompt.
  //
  // "And before that?" is the most-asked follow-up on the site, and it is
  // two hops: resolve "that" to the current employer, then find its
  // predecessor. A 1.2B model reading an ordered list takes one hop and names
  // whichever employer looks most prominent (the four-year CEO stint). Spelled
  // out, and placed where the model reads hardest, it becomes a lookup.
  //
  // It is deliberately one short sentence: everything at pin 2 is paid for on
  // every prefill *and* forfeits the KV cache, so it has to earn its tokens.
  out.push({
    id: 'cv:current-transition',
    kind: 'cv',
    title: "Alex's current and previous role",
    url,
    pin: 2,
    text:
      `Alex's current role is ${experience[0].title} at ${experience[0].company}, ` +
      `and the single role he held immediately before it was ${experience[1].title} at ${experience[1].company} (${experience[1].duration}). ` +
      `No other company came between them.`,
  });

  experience.forEach((e, i) => {
    const lines = [
      `Alex's role: ${e.title} at ${e.company} (${e.duration}, ${e.location}).${i === 0 ? ' This is his current position.' : ''}`,
    ];
    if (e.description) lines.push(e.description);
    if (e.achievements?.length) {
      lines.push(e.achievements.map(a => `- ${a}`).join('\n'));
    }
    if (e.skills?.length) {
      lines.push(`Skills used in this role: ${e.skills.join(', ')}.`);
    }
    out.push({
      id: `cv:exp:${i}`,
      kind: 'cv',
      title: `${e.title}, ${e.company}`,
      url,
      text: lines.join('\n'),
    });
  });

  education.forEach((e, i) => {
    const lines = [
      `Alex's education: ${e.degree}, ${e.institution} (${e.duration}, ${e.location}).`,
    ];
    if (e.description) lines.push(e.description);
    if (e.relevantCoursework?.length) {
      lines.push(`Coursework: ${e.relevantCoursework.join(', ')}.`);
    }
    if (e.achievements?.length) {
      lines.push(e.achievements.map(a => `- ${a}`).join('\n'));
    }
    out.push({
      id: `cv:edu:${i}`,
      kind: 'cv',
      title: `${e.degree}, ${e.institution}`,
      url,
      text: lines.join('\n'),
    });
  });

  // Skills are split by category rather than dumped as one list: a single
  // 200-term blob embeds to a meaningless centroid and matches everything.
  const skillGroups = [
    ['technical', 'Technical skills and technologies Alex works with'],
    ['soft', 'Leadership and non-technical skills Alex has'],
    ['languages', 'Spoken languages Alex knows'],
  ];
  for (const [key, label] of skillGroups) {
    const list = skills[key];
    if (!list?.length) continue;
    for (let i = 0; i < list.length; i += 18) {
      const slice = list.slice(i, i + 18);
      out.push({
        id: `cv:skills:${key}:${i / 18}`,
        kind: 'cv',
        title: `Alex's ${key} skills`,
        url,
        text: `${label}: ${slice.join(', ')}.`,
      });
    }
  }

  if (certifications?.length) {
    out.push({
      id: 'cv:certs',
      kind: 'cv',
      title: "Alex's certifications",
      url,
      text: `Alex's certifications:\n${certifications
        .map(c => `- ${c.name}, issued by ${c.issuer} (${c.date}).`)
        .join('\n')}`,
    });
  }

  return out;
}

function homeChunks(homepageConfig) {
  const out = [];
  const url = '/';
  const { hero, about, consulting, expertise } = homepageConfig;

  about.paragraphs.forEach((p, i) => {
    out.push({
      id: `home:about:${i}`,
      kind: 'home',
      title: 'About Alex',
      url,
      text: `From Alex's homepage (${hero.subtitle}):\n${p}`,
    });
  });

  // "can I hire him", "is he available", "what does he charge" are all the
  // same question and none of them share a word with the consulting copy,
  // which talks about engagements and problems. The lead sentence supplies
  // the vocabulary visitors actually use.
  out.push({
    id: 'home:consulting',
    kind: 'home',
    title: "Alex's consulting work",
    url,
    text:
      `Hiring Alex: he is available for consulting engagements and freelance work, and can be contacted to discuss one. ` +
      `Alex's consulting practice — ${consulting.title}:\n${consulting.description}`,
  });

  out.push({
    id: 'home:expertise',
    kind: 'home',
    title: 'What Alex works on',
    url,
    text: `What Alex works on:\n${expertise.items
      .map(it => `- ${it.title}: ${it.description}`)
      .join('\n')}`,
  });

  return out;
}

function projectChunks(projectsConfig) {
  return projectsConfig.projects.map(p => ({
    id: `project:${p.name}`,
    kind: 'project',
    title: p.name,
    url: p.url,
    text: `Alex's open-source project "${p.name}" (written in ${p.language}${
      p.featured ? ', a featured project' : ''
    }): ${p.description} Topics: ${p.tags.join(', ')}.${
      typeof p.stars === 'number' && p.stars > 0
        ? ` ${p.stars} stars on GitHub.`
        : ''
    } Source: ${p.url}`,
  }));
}

function blogChunks(blogDir) {
  const out = [];
  const files = fs
    .readdirSync(blogDir)
    .filter(f => f.endsWith('.md'))
    .sort();

  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const url = `/blog/${slug}`;
    const raw = fs.readFileSync(path.join(blogDir, file), 'utf8');
    const { data, content } = matter(raw);
    const title = data.title || slug;
    const date = data.date || '';
    const category = data.category || '';
    const label = `${category === 'Press' ? 'Press article about Alex' : 'Blog post by Alex'} "${title}" (${date})`;

    // The description is its own chunk: it is a human-written one-line summary,
    // which is exactly the shape a "what is X about" query embeds to.
    if (data.description) {
      out.push({
        id: `blog:${slug}:summary`,
        kind: 'blog',
        title,
        url,
        text: `${label}: ${data.description}`,
      });
    }

    const body = stripMarkdown(content);
    packParagraphs(body).forEach((passage, i) => {
      out.push({
        id: `blog:${slug}:${i}`,
        kind: 'blog',
        title,
        url,
        text: `From ${label}:\n${passage}`,
      });
    });
  }

  return out;
}

/** Assembles every passage the chatbot can retrieve. */
export function buildCorpus() {
  const { cvData } = require(path.join(ROOT, 'src/config/cv.ts'));
  const { homepageConfig } = require(path.join(ROOT, 'src/config/homepage.ts'));
  const { projectsConfig } = require(path.join(ROOT, 'src/config/projects.ts'));

  return [
    ...cvChunks(cvData),
    ...homeChunks(homepageConfig),
    ...projectChunks(projectsConfig),
    ...blogChunks(path.join(ROOT, 'src/content/blog')),
  ];
}
