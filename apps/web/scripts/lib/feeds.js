/**
 * The timeline as Atom and as JSON Feed.
 *
 * gatsby-plugin-feed writes the RSS; these are the other two formats a
 * reader understands, from the same posts, with the same full content. Pure
 * functions of the post list, so gatsby-node can call them at the end of a
 * build and the tests can call them on a fabricated list.
 *
 * Both feeds are ordered as given (newest first) and dated by the newest
 * post rather than the build, so an unchanged timeline is an unchanged feed.
 */

const escapeXml = s =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** A frontmatter date, however Gatsby hands it over, as an RFC 3339 instant. */
const instant = date => {
  const day = /^(\d{4}-\d{2}-\d{2})/.exec(String(date));
  return day ? `${day[1]}T00:00:00Z` : String(date);
};

/**
 * @typedef {{
 *   title: string, url: string, html: string, date: string,
 *   description?: string, category?: string, pdf?: string,
 * }} FeedPost
 * @typedef {{
 *   title: string, description: string, siteUrl: string, homeUrl: string,
 *   feedUrl: string, author: { name: string, url: string, email?: string },
 * }} FeedMeta
 */

/**
 * @param {FeedMeta} meta
 * @param {FeedPost[]} posts
 * @returns {string} the feed, as JSON text
 */
function renderJsonFeed(meta, posts) {
  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: meta.title,
    home_page_url: meta.homeUrl,
    feed_url: meta.feedUrl,
    description: meta.description,
    language: 'en',
    authors: [{ name: meta.author.name, url: meta.author.url }],
    items: posts.map(post => {
      const item = {
        id: post.url,
        url: post.url,
        title: post.title,
        content_html: post.html,
        date_published: instant(post.date),
        language: 'en',
      };
      if (post.description) item.summary = post.description;
      if (post.category) item.tags = [post.category.toLowerCase()];
      if (post.pdf)
        item.attachments = [{ url: post.pdf, mime_type: 'application/pdf' }];
      return item;
    }),
  };
  return JSON.stringify(feed, null, 2) + '\n';
}

/**
 * @param {FeedMeta} meta
 * @param {FeedPost[]} posts
 * @returns {string} the feed, as XML text
 */
function renderAtom(meta, posts) {
  const updated = posts.length ? instant(posts[0].date) : instant('1970-01-01');
  const entries = posts.map(post => {
    const lines = [
      '  <entry>',
      `    <title>${escapeXml(post.title)}</title>`,
      `    <link rel="alternate" type="text/html" href="${escapeXml(post.url)}"/>`,
    ];
    if (post.pdf)
      lines.push(
        `    <link rel="enclosure" type="application/pdf" href="${escapeXml(post.pdf)}"/>`
      );
    lines.push(
      `    <id>${escapeXml(post.url)}</id>`,
      `    <published>${instant(post.date)}</published>`,
      `    <updated>${instant(post.date)}</updated>`
    );
    if (post.category)
      lines.push(
        `    <category term="${escapeXml(post.category.toLowerCase())}"/>`
      );
    if (post.description)
      lines.push(`    <summary>${escapeXml(post.description)}</summary>`);
    lines.push(
      `    <content type="html">${escapeXml(post.html)}</content>`,
      '  </entry>'
    );
    return lines.join('\n');
  });

  const author = [
    '  <author>',
    `    <name>${escapeXml(meta.author.name)}</name>`,
    `    <uri>${escapeXml(meta.author.url)}</uri>`,
    ...(meta.author.email
      ? [`    <email>${escapeXml(meta.author.email)}</email>`]
      : []),
    '  </author>',
  ].join('\n');

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en">',
    `  <title>${escapeXml(meta.title)}</title>`,
    `  <subtitle>${escapeXml(meta.description)}</subtitle>`,
    `  <link rel="self" type="application/atom+xml" href="${escapeXml(meta.feedUrl)}"/>`,
    `  <link rel="alternate" type="text/html" href="${escapeXml(meta.homeUrl)}"/>`,
    `  <id>${escapeXml(meta.homeUrl)}</id>`,
    `  <updated>${updated}</updated>`,
    author,
    ...entries,
    '</feed>',
    '',
  ].join('\n');
}

module.exports = { renderJsonFeed, renderAtom, escapeXml, instant };
