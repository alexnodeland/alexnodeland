/**
 * The Atom and JSON Feed renderers behind atom.xml and feed.json, on a
 * fabricated post list: the shape each format asks for, the escaping, and
 * that an unchanged timeline is an unchanged feed.
 */
const {
  renderAtom,
  renderJsonFeed,
  instant,
} = require('../../../../scripts/lib/feeds.js');

const meta = {
  title: 'alex nodeland — timeline',
  description: 'things built, played, and written about.',
  siteUrl: 'https://alexnodeland.com',
  homeUrl: 'https://alexnodeland.com/timeline/',
  feedUrl: 'https://alexnodeland.com/atom.xml',
  author: {
    name: 'alex nodeland',
    url: 'https://alexnodeland.com/',
    email: 'alex@example.com',
  },
};

const posts = [
  {
    title: 'Fish & Chips <3',
    url: 'https://alexnodeland.com/timeline/240101_fish/',
    html: '<p>a "quoted" & <em>escaped</em> body</p>',
    date: '2024-01-01T00:00:00.000Z',
    description: 'A post about food.',
    category: 'Notes',
    pdf: 'https://alexnodeland.com/timeline/pdf/240101_fish.pdf',
  },
  {
    title: 'Older',
    url: 'https://alexnodeland.com/timeline/230101_older/',
    html: '<p>older</p>',
    date: '2023-01-01',
  },
];

describe('instant', () => {
  it('turns a frontmatter date into an RFC 3339 instant at midnight UTC', () => {
    expect(instant('2024-01-01')).toBe('2024-01-01T00:00:00Z');
    expect(instant('2024-01-01T00:00:00.000Z')).toBe('2024-01-01T00:00:00Z');
  });
});

describe('JSON Feed', () => {
  it('is a version 1.1 feed with one item per post, dated and tagged', () => {
    const feed = JSON.parse(renderJsonFeed(meta, posts));
    expect(feed.version).toBe('https://jsonfeed.org/version/1.1');
    expect(feed.home_page_url).toBe(meta.homeUrl);
    expect(feed.feed_url).toBe(meta.feedUrl);
    expect(feed.authors).toEqual([
      { name: 'alex nodeland', url: 'https://alexnodeland.com/' },
    ]);
    expect(feed.items).toHaveLength(2);
    expect(feed.items[0]).toEqual({
      id: posts[0].url,
      url: posts[0].url,
      title: 'Fish & Chips <3',
      content_html: posts[0].html,
      date_published: '2024-01-01T00:00:00Z',
      language: 'en',
      summary: 'A post about food.',
      tags: ['notes'],
      attachments: [{ url: posts[0].pdf, mime_type: 'application/pdf' }],
    });
    // A post with no description, tag or pdf leaves those keys out.
    expect(Object.keys(feed.items[1]).sort()).toEqual(
      [
        'content_html',
        'date_published',
        'id',
        'language',
        'title',
        'url',
      ].sort()
    );
  });
});

describe('Atom', () => {
  it('is a well-formed feed dated by its newest post, with escaped content', () => {
    const xml = renderAtom(meta, posts);
    expect(
      xml.startsWith(
        '<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom"'
      )
    ).toBe(true);
    expect(xml).toContain('<updated>2024-01-01T00:00:00Z</updated>');
    expect(xml).toContain('<title>Fish &amp; Chips &lt;3</title>');
    expect(xml).toContain(
      '<content type="html">&lt;p&gt;a &quot;quoted&quot; &amp; &lt;em&gt;escaped&lt;/em&gt; body&lt;/p&gt;</content>'
    );
    expect(xml).toContain('<category term="notes"/>');
    expect(xml).toContain(
      `<link rel="enclosure" type="application/pdf" href="${posts[0].pdf}"/>`
    );
    expect(xml).toContain('<email>alex@example.com</email>');
    expect((xml.match(/<entry>/g) || []).length).toBe(2);
    // No raw ampersand or angle bracket survives outside a tag.
    const document = new DOMParser().parseFromString(xml, 'application/xml');
    expect(document.querySelector('parsererror')).toBeNull();
    expect(document.querySelectorAll('entry')).toHaveLength(2);
  });

  it('is byte-for-byte stable for the same posts', () => {
    expect(renderAtom(meta, posts)).toBe(renderAtom(meta, posts));
    expect(renderJsonFeed(meta, posts)).toBe(renderJsonFeed(meta, posts));
  });
});
