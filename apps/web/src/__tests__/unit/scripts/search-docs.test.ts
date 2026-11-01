import { cvData } from '../../../config/cv';
import { homepageConfig } from '../../../config/homepage';
import { appsConfig, projectsConfig } from '../../../config/projects';
import { projectAnchor } from '../../../components/projects/ProjectCard';

const { buildSearchDocs } = require('../../../../scripts/lib/search-docs.js');

interface Doc {
  id: string;
  kind: string;
  title: string;
  url: string;
  summary: string;
  meta?: string;
  text: string;
}

const POSTS = [
  {
    slug: '240101_older',
    data: {
      title: 'An Older Post',
      date: '2024-01-01',
      category: 'Notes',
      description: 'What the older one is about.',
    },
    content: `# Heading\n\nA [link](https://x.y) and **bold** words. ${'long '.repeat(2000)}`,
  },
  {
    slug: '260101_newer',
    data: { title: 'A Newer Post', date: '2026-01-01', category: 'Press' },
    content: 'Body.',
  },
];

const docs: Doc[] = buildSearchDocs({
  projectsConfig,
  appsConfig,
  homepageConfig,
  cvData,
  posts: POSTS,
  stripMarkdown: (md: string) => md.replace(/[#*[\]]/g, ''),
});

const byKind = (kind: string) => docs.filter(d => d.kind === kind);

describe('the search documents', () => {
  it('lists the pages first, the nav among them', () => {
    expect(docs[0].kind).toBe('page');
    const urls = byKind('page').map(d => d.url);
    for (const url of ['/', '/timeline/', '/projects/', '/apps/', '/cv/']) {
      expect(urls).toContain(url);
    }
  });

  it('has every project once, on the page and at the card that lists it', () => {
    for (const project of projectsConfig.projects) {
      const found = docs.filter(d => d.id === `project:${project.name}`);
      expect(found).toHaveLength(1);
      const page = project.tier === 'app' ? '/apps/' : '/projects/';
      // The same anchor the card carries, so the result lands on it.
      expect(found[0].url).toBe(`${page}#${projectAnchor(project.name)}`);
      expect(found[0].summary).toBe(project.description);
    }
  });

  it('names what kind of thing each project is by its tier', () => {
    const kindOf = (tier: string) =>
      projectsConfig.projects
        .filter(p => p.tier === tier)
        .map(p => docs.find(d => d.id === `project:${p.name}`)?.kind);
    expect(new Set(kindOf('flagship'))).toEqual(new Set(['project']));
    expect(new Set(kindOf('app'))).toEqual(new Set(['app']));
    expect(new Set(kindOf('lab'))).toEqual(new Set(['experiment']));
  });

  it('makes each post one document, newest first, with its category and year', () => {
    const posts = byKind('post');
    expect(posts.map(d => d.title)).toEqual(['A Newer Post', 'An Older Post']);
    expect(posts[0].url).toBe('/timeline/260101_newer/');
    expect(posts[0].meta).toBe('press · 2026');
    expect(posts[1].summary).toBe('What the older one is about.');
  });

  it('strips the markdown and caps the body it searches', () => {
    const older = byKind('post').find(d => d.title === 'An Older Post')!;
    expect(older.text).not.toMatch(/[#*]/);
    expect(older.text.length).toBeLessThanOrEqual(4000);
  });

  it('has every cv role, pointing at the cv', () => {
    const roles = byKind('role');
    expect(roles).toHaveLength(cvData.experience.length);
    expect(roles[0].title).toBe(
      `${cvData.experience[0].title}, ${cvData.experience[0].company}`
    );
    expect(new Set(roles.map(d => d.url))).toEqual(new Set(['/cv/']));
  });

  it('gives every document a unique id', () => {
    const ids = docs.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
