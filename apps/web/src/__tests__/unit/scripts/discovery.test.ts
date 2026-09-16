/**
 * The llms.txt and security.txt renderers, on fabricated inputs.
 */
const {
  renderLlmsTxt,
  renderSecurityTxt,
  securityExpiry,
} = require('../../../../scripts/lib/discovery.js');

describe('llms.txt', () => {
  const text = renderLlmsTxt({
    name: 'alex nodeland',
    url: 'https://alexnodeland.com',
    description: 'ai engineer and mathematician.',
    author: 'alex nodeland',
    summary: 'a paragraph.\n\nanother.',
    pages: [
      {
        title: 'timeline',
        url: 'https://alexnodeland.com/timeline/',
        description: 'posts.',
      },
    ],
    posts: [
      {
        title: 'A Post',
        url: 'https://alexnodeland.com/timeline/a/',
        date: '2024-01-01',
        category: 'Notes',
        description: 'About a thing.',
      },
      {
        title: 'Bare',
        url: 'https://alexnodeland.com/timeline/b/',
        date: '2023-01-01',
      },
    ],
    projects: [
      {
        name: 'fugue',
        url: 'https://github.com/alexnodeland/fugue',
        site: 'https://fugue.run/',
        description: 'a ppl for rust.',
        language: 'Rust',
      },
      {
        name: 'bare',
        url: 'https://github.com/alexnodeland/bare',
        description: 'no site.',
        language: 'Python',
      },
    ],
    machine: [
      {
        title: 'graph.jsonld',
        url: 'https://alexnodeland.com/graph.jsonld',
        description: 'everything.',
      },
    ],
  });

  it('opens with the name, the blockquote summary and the prose', () => {
    expect(
      text.startsWith(
        '# alex nodeland\n\n> ai engineer and mathematician.\n\na paragraph.\n\nanother.\n'
      )
    ).toBe(true);
  });

  it('lists pages, posts, projects and machine-readable forms as markdown links', () => {
    expect(text).toContain(
      '## pages\n\n- [timeline](https://alexnodeland.com/timeline/): posts.'
    );
    expect(text).toContain(
      '- [A Post](https://alexnodeland.com/timeline/a/): 2024-01-01 · notes · About a thing.'
    );
    expect(text).toContain(
      '- [Bare](https://alexnodeland.com/timeline/b/): 2023-01-01'
    );
    expect(text).toContain(
      '- [fugue](https://fugue.run/): a ppl for rust. (rust, source at https://github.com/alexnodeland/fugue)'
    );
    expect(text).toContain(
      '- [bare](https://github.com/alexnodeland/bare): no site. (python)'
    );
    expect(text).toContain('## machine-readable');
    expect(text).toContain(
      '- [graph.jsonld](https://alexnodeland.com/graph.jsonld): everything.'
    );
  });

  it('ends with the Optional section the spec reserves for the extras', () => {
    const optional = text.slice(text.indexOf('## Optional'));
    expect(optional).toContain('graph.ttl');
    expect(optional).toContain('void.ttl');
    expect(optional).toContain('provenance.jsonld');
  });
});

describe('security.txt', () => {
  it('carries the four fields RFC 9116 wants, contact and expiry first', () => {
    const text = renderSecurityTxt({
      contact: 'mailto:alex@example.com',
      canonical: 'https://alexnodeland.com/.well-known/security.txt',
      expires: '2027-01-01T00:00:00Z',
    });
    const fields = text
      .split('\n')
      .filter((line: string) => line && !line.startsWith('#'));
    expect(fields).toEqual([
      'Contact: mailto:alex@example.com',
      'Expires: 2027-01-01T00:00:00Z',
      'Preferred-Languages: en',
      'Canonical: https://alexnodeland.com/.well-known/security.txt',
    ]);
  });

  it('expires a little under a year from the build', () => {
    expect(securityExpiry(new Date('2026-09-16T12:34:56.789Z'))).toBe(
      '2027-09-15T12:34:56Z'
    );
  });
});
