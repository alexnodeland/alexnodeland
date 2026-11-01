/**
 * The documents the site-wide search (⌘K) looks through: one per page, post,
 * project, app and CV role, each with where it lives and the line that says
 * what it is.
 *
 * The chat's corpus is passages, cut for a model to read; this is documents,
 * cut for a person to pick from. They share the content and the markdown
 * stripping, so the two cannot disagree about what the site says, but a
 * search result is a thing to open rather than a paragraph to quote, so a
 * post is one document here however many passages it is there.
 *
 * Pure functions of their inputs: scripts/lib/search-corpus.mjs reads the
 * config and the posts and hands them over, and the tests hand over their own.
 */

/**
 * A post's body is searched, not shown, and past the first few thousand
 * characters it adds words a person would never type to find it. The cap keeps
 * the file the browser fetches small.
 */
const BODY_CHARS = 4000;

/** @typedef {'page' | 'post' | 'project' | 'app' | 'experiment' | 'role'} SearchKind */

/**
 * @typedef {{
 *   id: string,
 *   kind: SearchKind,
 *   title: string,
 *   url: string,
 *   summary: string,
 *   meta?: string,
 *   text: string,
 * }} SearchDoc
 */

/** The fragment a project's card carries; the same slug the linked data mints. */
const slugify = value =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** @returns {SearchDoc[]} */
function pageDocs({ projectsConfig, appsConfig, homepageConfig, cvData }) {
  return [
    {
      id: 'page:home',
      kind: 'page',
      title: 'home',
      url: '/',
      summary: homepageConfig.hero.subtitle,
      text: homepageConfig.about.paragraphs.join(' '),
    },
    {
      id: 'page:timeline',
      kind: 'page',
      title: 'timeline',
      url: '/timeline/',
      summary: 'things built, played, and written about.',
      text: 'posts press notes music projects blog writing',
    },
    {
      id: 'page:projects',
      kind: 'page',
      title: projectsConfig.title,
      url: '/projects/',
      summary: projectsConfig.subtitle,
      text: 'open source libraries systems experiments github',
    },
    {
      id: 'page:apps',
      kind: 'page',
      title: appsConfig.title,
      url: '/apps/',
      summary: appsConfig.subtitle,
      text: 'mac apps command line tools plugins hardware homebrew install',
    },
    {
      id: 'page:cv',
      kind: 'page',
      title: 'cv',
      url: '/cv/',
      summary: 'roles, research, and skills.',
      text: `${cvData.personal.title} resume experience education skills`,
    },
    {
      id: 'page:consulting',
      kind: 'page',
      title: 'consulting',
      url: '/consulting/',
      summary: 'past work, and how an engagement runs.',
      text: homepageConfig.consulting.description,
    },
    {
      id: 'page:vocab',
      kind: 'page',
      title: 'vocab',
      url: '/vocab/',
      summary: 'the concepts the site is organised by.',
      text: 'vocabulary concepts categories linked data skos',
    },
  ];
}

/**
 * @param {Array<{ slug: string, data: Record<string, unknown>, content: string }>} posts
 * @param {(md: string) => string} stripMarkdown
 * @returns {SearchDoc[]}
 */
function postDocs(posts, stripMarkdown) {
  return [...posts]
    .sort((a, b) => b.slug.localeCompare(a.slug))
    .map(({ slug, data, content }) => {
      const year = String(data.date || '').slice(0, 4);
      const category = String(data.category || '').toLowerCase();
      const description = String(data.description || '');
      return {
        id: `post:${slug}`,
        kind: 'post',
        title: String(data.title || slug),
        url: `/timeline/${slug}/`,
        summary: description,
        meta: [category, year].filter(Boolean).join(' · '),
        text: `${description} ${stripMarkdown(content)}`.slice(0, BODY_CHARS),
      };
    });
}

const KIND_BY_TIER = { flagship: 'project', app: 'app', lab: 'experiment' };

/** @returns {SearchDoc[]} */
function projectDocs(projectsConfig) {
  return projectsConfig.projects.map(project => {
    const page = project.tier === 'app' ? '/apps/' : '/projects/';
    return {
      id: `project:${project.name}`,
      kind: KIND_BY_TIER[project.tier] || 'project',
      title: project.name,
      url: `${page}#project-${slugify(project.name)}`,
      summary: project.description,
      meta: project.language.toLowerCase(),
      text: [
        project.description,
        project.tags.join(' '),
        project.language,
        project.install || '',
      ].join(' '),
    };
  });
}

/** @returns {SearchDoc[]} */
function roleDocs(cvData) {
  return cvData.experience.map((role, index) => ({
    id: `role:${index}`,
    kind: 'role',
    title: `${role.title}, ${role.company}`,
    url: '/cv/',
    summary: role.description || role.achievements[0] || '',
    meta: role.duration.toLowerCase(),
    text: [
      role.description || '',
      ...role.achievements,
      ...(role.skills || []),
    ].join(' '),
  }));
}

/**
 * Everything the search can find, in the order an empty query lists it:
 * the pages first, then the work, then the writing, then the roles.
 *
 * @returns {SearchDoc[]}
 */
function buildSearchDocs({
  projectsConfig,
  appsConfig,
  homepageConfig,
  cvData,
  posts,
  stripMarkdown,
}) {
  return [
    ...pageDocs({ projectsConfig, appsConfig, homepageConfig, cvData }),
    ...projectDocs(projectsConfig),
    ...postDocs(posts, stripMarkdown),
    ...roleDocs(cvData),
  ];
}

module.exports = { buildSearchDocs, slugify };
