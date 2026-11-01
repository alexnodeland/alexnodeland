/**
 * The discovery files: what a machine reads before it reads the site.
 *
 * - `llms.txt` (llmstxt.org): a markdown summary of the site for an
 *   assistant — what it is, where the pages are, where the machine-readable
 *   forms are — the human-readable partner to /graph.jsonld.
 * - `security.txt` (RFC 9116): how to report a security problem.
 *
 * Pure functions of their inputs; scripts/build-discovery.mjs feeds them
 * the config and writes the results, and the tests feed them fabricated
 * inputs.
 */

/**
 * @typedef {{
 *   name: string, url: string, description: string, author: string,
 *   summary: string,
 *   pages: Array<{ title: string, url: string, description: string }>,
 *   posts: Array<{ title: string, url: string, description?: string, date: string, category?: string }>,
 *   projects: Array<{ name: string, url: string, site?: string, description: string, language: string, tier?: 'flagship' | 'app' | 'lab', install?: string, installLabel?: string }>,
 *   machine: Array<{ title: string, url: string, description: string }>,
 * }} SiteSummary
 */

const line = (title, url, description) =>
  description ? `- [${title}](${url}): ${description}` : `- [${title}](${url})`;

const projectLine = p =>
  line(
    p.name,
    p.site || p.url,
    `${p.description} (${p.language.toLowerCase()}${p.site ? `, source at ${p.url}` : ''})${
      p.install
        ? ` install${p.installLabel ? ` (${p.installLabel})` : ''}: \`${p.install}\``
        : ''
    }`
  );

/**
 * The projects in the sections the site lists them in: the flagship work on
 * /projects, the apps on /apps, the experiments at the foot of /projects. A
 * project with no tier is flagship, so a summary built before the tiers
 * existed still renders as one list. A section with nothing in it is left out.
 */
const projectSections = projects => {
  const groups = [
    { title: 'projects', tier: 'flagship', lead: [] },
    {
      title: 'apps',
      tier: 'app',
      lead: [
        'small tools in daily use, with the one line that installs each where there is one.',
        '',
      ],
    },
    { title: 'experiments', tier: 'lab', lead: [] },
  ];
  return groups.flatMap(group => {
    const members = projects.filter(p => (p.tier || 'flagship') === group.tier);
    if (members.length === 0) return [];
    return [
      `## ${group.title}`,
      '',
      ...group.lead,
      ...members.map(projectLine),
      '',
    ];
  });
};

/**
 * @param {SiteSummary} site
 * @returns {string}
 */
function renderLlmsTxt(site) {
  const sections = [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    site.summary,
    '',
    'everything on the site is written in lowercase on purpose; the cv is the one document that is not.',
    '',
    '## pages',
    '',
    ...site.pages.map(p => line(p.title, p.url, p.description)),
    '',
    '## posts',
    '',
    'the timeline, newest first. each post is also served as a pdf beside it.',
    '',
    ...site.posts.map(p =>
      line(
        p.title,
        p.url,
        [p.date, p.category ? p.category.toLowerCase() : '', p.description]
          .filter(Boolean)
          .join(' · ')
      )
    ),
    '',
    ...projectSections(site.projects),
    '## machine-readable',
    '',
    'the same content as data, for anything that would rather not parse html.',
    '',
    ...site.machine.map(m => line(m.title, m.url, m.description)),
    '',
    '## Optional',
    '',
    line(
      'graph.ttl',
      `${site.url}/graph.ttl`,
      'the whole graph as turtle, the same triples as graph.jsonld.'
    ),
    line(
      'void.ttl',
      `${site.url}/void.ttl`,
      'the void description of the dataset: vocabularies, dumps, counts.'
    ),
    line(
      'provenance.jsonld',
      `${site.url}/provenance.jsonld`,
      'prov-o for the site model: content snapshot → corpus → training run → weights.'
    ),
    '',
  ];
  return sections.join('\n');
}

/**
 * @param {{ contact: string, canonical: string, expires: string, languages?: string }} options
 * @returns {string}
 */
function renderSecurityTxt({ contact, canonical, expires, languages = 'en' }) {
  return [
    '# security.txt (RFC 9116) for the site at the canonical address below.',
    '# regenerated on every deploy, so the expiry is always in the future.',
    `Contact: ${contact}`,
    `Expires: ${expires}`,
    `Preferred-Languages: ${languages}`,
    `Canonical: ${canonical}`,
    '',
  ].join('\n');
}

/**
 * RFC 9116 wants Expires less than a year out. The deploy runs nightly, so
 * a value a little under a year from the build is always fresh.
 * @param {Date} [now]
 */
function securityExpiry(now = new Date()) {
  const expires = new Date(now.getTime());
  expires.setUTCDate(expires.getUTCDate() + 364);
  expires.setUTCMilliseconds(0);
  return expires.toISOString().replace('.000Z', 'Z');
}

module.exports = { renderLlmsTxt, renderSecurityTxt, securityExpiry };
