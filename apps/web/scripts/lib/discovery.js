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
 *   projects: Array<{ name: string, url: string, site?: string, description: string, language: string }>,
 *   machine: Array<{ title: string, url: string, description: string }>,
 * }} SiteSummary
 */

const line = (title, url, description) =>
  description ? `- [${title}](${url}): ${description}` : `- [${title}](${url})`;

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
    '## projects',
    '',
    ...site.projects.map(p =>
      line(
        p.name,
        p.site || p.url,
        `${p.description} (${p.language.toLowerCase()}${p.site ? `, source at ${p.url}` : ''})`
      )
    ),
    '',
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
