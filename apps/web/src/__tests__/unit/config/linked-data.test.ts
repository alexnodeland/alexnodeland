/**
 * The site's graph: that every page's nodes carry stable, dereferenceable
 * identifiers, that the vocabulary covers every category the config uses,
 * and that the shapes schema.org and SKOS consumers rely on are the ones
 * emitted. The RDF serialisation of these nodes is tested beside the script
 * that writes it (scripts/rdf.test.ts).
 */
import { AudienceTag, cvData, cvSource } from '../../../config/cv';
import {
  isoDate,
  isoDateRange,
  isoDay,
  jsonLdDocument,
  LD,
  mergeNodes,
  pageUrl,
  slugify,
  VOCABULARY,
  blogPostingNode,
  breadcrumbNode,
  conceptFor,
  consultingGraph,
  cvGraph,
  cvNodes,
  homeGraph,
  personNode,
  postGraph,
  projectNode,
  projectsGraph,
  timelineGraph,
  vocabGraph,
  vocabularyNodes,
  websiteNode,
  JsonLdNode,
} from '../../../config/linked-data';
import { projectsConfig } from '../../../config/projects';
import { siteConfig } from '../../../config/site';

const SITE = siteConfig.siteUrl;

const ids = (nodes: JsonLdNode[]) =>
  nodes.map(n => n['@id']).filter((id): id is string => Boolean(id));

const byType = (nodes: JsonLdNode[], type: string) =>
  nodes.filter(n => ([] as string[]).concat(n['@type'] ?? []).includes(type));

describe('identifiers', () => {
  it('names every page with its canonical, trailing-slash URL', () => {
    expect(pageUrl('/')).toBe(`${SITE}/`);
    expect(pageUrl('')).toBe(`${SITE}/`);
    expect(pageUrl('/timeline')).toBe(`${SITE}/timeline/`);
    expect(pageUrl('timeline/')).toBe(`${SITE}/timeline/`);
  });

  it('mints fragment identifiers on the pages that describe their subject', () => {
    expect(LD.person).toBe(`${SITE}/#me`);
    expect(LD.website).toBe(`${SITE}/#website`);
    expect(LD.blog).toBe(`${SITE}/timeline/#blog`);
    expect(LD.post('/a-post/')).toBe(`${SITE}/timeline/a-post/#post`);
    expect(LD.post('a-post')).toBe(`${SITE}/timeline/a-post/#post`);
    expect(LD.project('Fugue Evo')).toBe(`${SITE}/projects/#project-fugue-evo`);
    expect(LD.concept('ai')).toBe(`${SITE}/vocab/#ai`);
    expect(LD.role(0)).toBe(`${SITE}/cv/#role-1`);
    expect(LD.organization('Stony Brook University')).toBe(
      `${SITE}/#org-stony-brook-university`
    );
  });

  it('slugifies to a safe fragment', () => {
    expect(slugify('Musiio (acquired by SoundCloud)')).toBe(
      'musiio-acquired-by-soundcloud'
    );
    expect(slugify('  C++ & DSP  ')).toBe('c-dsp');
  });
});

describe('dates', () => {
  it('reads a year, a month and year, and nothing else', () => {
    expect(isoDate('2018')).toBe('2018');
    expect(isoDate('Jan 2018')).toBe('2018-01');
    expect(isoDate('September 2019')).toBe('2019-09');
    expect(isoDate('Present')).toBeUndefined();
    expect(isoDate('sometime')).toBeUndefined();
  });

  it('turns a CV duration into an ISO range, open when it is current', () => {
    expect(isoDateRange('2016 - 2017')).toEqual({
      startDate: '2016',
      endDate: '2017',
    });
    expect(isoDateRange('Jan 2018 - Jun 2018')).toEqual({
      startDate: '2018-01',
      endDate: '2018-06',
    });
    expect(isoDateRange('2024 - Present')).toEqual({ startDate: '2024' });
    expect(isoDateRange('2022 – present')).toEqual({ startDate: '2022' });
  });

  it('keeps the day of a frontmatter date, whatever Gatsby appends', () => {
    expect(isoDay('2026-09-13')).toBe('2026-09-13');
    expect(isoDay('2026-09-13T00:00:00.000Z')).toBe('2026-09-13');
    expect(isoDay('yesterday')).toBe('yesterday');
  });
});

describe('the vocabulary', () => {
  it('has a concept for every project category', () => {
    for (const { id } of projectsConfig.categories) {
      expect(conceptFor(id)).toBeDefined();
    }
  });

  it('has a concept for every audience a CV bullet can be written for', () => {
    // The tags the CV actually uses, gathered from the source itself, so a
    // new tag needs a concept before it ships.
    const used = new Set<AudienceTag>();
    for (const role of cvSource.experience) {
      for (const bullet of role.achievements) {
        if (typeof bullet !== 'string') bullet.tags?.forEach(t => used.add(t));
      }
    }
    for (const skill of cvSource.skills.technical) {
      if (typeof skill !== 'string') skill.tags?.forEach(t => used.add(t));
    }
    expect(used.size).toBeGreaterThan(0);
    for (const tag of Array.from(used)) {
      expect(conceptFor(tag)).toBeDefined();
    }
  });

  it('has a concept for every post category the timeline knows', () => {
    // The tags the markdown carries today; a new one needs an entry here
    // and in VOCABULARY (the build warns rather than fails).
    for (const category of ['Music', 'Notes', 'Press', 'Projects']) {
      expect(conceptFor(category)).toBeDefined();
    }
  });

  it('lists every collection member and every relation as a concept', () => {
    const known = new Set(VOCABULARY.concepts.map(c => c.id));
    for (const col of VOCABULARY.collections) {
      for (const member of col.members) expect(known.has(member)).toBe(true);
    }
    for (const concept of VOCABULARY.concepts) {
      for (const related of concept.related ?? []) {
        expect(known.has(related)).toBe(true);
        // SKOS related is symmetric; the scheme says so on both sides.
        expect(
          VOCABULARY.concepts.find(c => c.id === related)?.related
        ).toContain(concept.id);
      }
    }
  });

  it('emits the scheme, its collections and every concept in SKOS', () => {
    const nodes = vocabularyNodes();
    const scheme = nodes.find(n => n['@id'] === LD.scheme) as JsonLdNode;
    expect(scheme['@type']).toBe('skos:ConceptScheme');
    expect(scheme['skos:hasTopConcept']).toHaveLength(
      VOCABULARY.concepts.length
    );
    expect(byType(nodes, 'skos:Collection')).toHaveLength(
      VOCABULARY.collections.length
    );
    const ai = nodes.find(n => n['@id'] === LD.concept('ai')) as JsonLdNode;
    expect(ai['skos:prefLabel']).toEqual({ '@value': 'ai', '@language': 'en' });
    expect(ai['skos:inScheme']).toEqual({ '@id': LD.scheme });
    expect(ai['skos:notation']).toBe('ai');
    expect(ai['skos:related']).toEqual(
      expect.arrayContaining([{ '@id': LD.concept('ai-eng') }])
    );
  });
});

describe('the person', () => {
  it('is one node, from the CV and the site config, with the site as its page', () => {
    const person = personNode();
    expect(person['@id']).toBe(LD.person);
    expect(person['@type']).toBe('Person');
    expect(person.name).toBe(cvData.personal.name);
    expect(person.url).toBe(`${SITE}/`);
    expect(person.email).toBe(`mailto:${siteConfig.contact.email}`);
    expect(person.sameAs).toEqual([
      siteConfig.social.linkedin,
      siteConfig.social.github,
    ]);
    expect(person.worksFor).toEqual({
      '@id': LD.organization(cvData.experience[0].company),
    });
    expect(person.address).toMatchObject({
      '@type': 'PostalAddress',
      addressLocality: 'Stamford',
      addressRegion: 'NY',
      addressCountry: 'US',
    });
  });

  it('carries the CV as dated roles, credentials and alma maters', () => {
    const nodes = cvNodes();
    const person = nodes[0];
    const roles = byType(nodes, 'OrganizationRole');
    expect(roles).toHaveLength(cvData.experience.length);
    expect(person.worksFor).toEqual(roles.map(r => ({ '@id': r['@id'] })));

    const current = roles[0];
    expect(current.roleName).toBe(cvData.experience[0].title);
    expect(current.startDate).toBeDefined();
    expect(current.endDate).toBeUndefined();
    expect(current.worksFor).toEqual({
      '@id': LD.organization(cvData.experience[0].company),
    });

    const degrees = byType(nodes, 'EducationalOccupationalCredential');
    expect(degrees).toHaveLength(cvData.education.length);
    expect(person.alumniOf).toEqual([
      { '@id': LD.organization('Stony Brook University') },
    ]);
    expect(person.hasCredential).toHaveLength(
      cvData.education.length + cvData.certifications.length
    );

    // Every organization a role or a degree points at is in the graph.
    const orgs = new Set(ids(byType(nodes, 'Organization')));
    for (const role of roles) {
      expect(orgs.has((role.worksFor as { '@id': string })['@id'])).toBe(true);
    }
  });

  it('says the CV is also a PDF', () => {
    const [person] = cvNodes();
    expect(person.hasPart).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          '@type': 'DigitalDocument',
          encodingFormat: 'application/pdf',
          url: `${SITE}/cv/alex-nodeland-cv.pdf`,
        }),
      ])
    );
  });
});

describe('the pages', () => {
  const post = {
    slug: '/260913_statusbar/',
    title: 'StatusBar',
    date: '2026-09-13T00:00:00.000Z',
    description: 'A menu bar app.',
    category: 'Projects',
  };

  it('describes the front page as the profile of the person', () => {
    const nodes = homeGraph();
    expect(ids(nodes)).toEqual(
      expect.arrayContaining([LD.website, LD.person, `${SITE}/`])
    );
    const page = nodes.find(n => n['@id'] === `${SITE}/`) as JsonLdNode;
    expect(page['@type']).toBe('ProfilePage');
    expect(page.mainEntity).toEqual({ '@id': LD.person });
    expect(page.isPartOf).toEqual({ '@id': LD.website });
    expect(websiteNode().author).toEqual({ '@id': LD.person });
  });

  it('describes a post with its date, its tag as a concept, and its PDF', () => {
    const node = blogPostingNode(post, { full: true });
    expect(node['@id']).toBe(`${SITE}/timeline/260913_statusbar/#post`);
    expect(node.datePublished).toBe('2026-09-13');
    expect(node.url).toBe(`${SITE}/timeline/260913_statusbar/`);
    expect(node.mainEntityOfPage).toBe(node.url);
    expect(node.about).toEqual({ '@id': LD.concept('projects') });
    expect(node.keywords).toBe('projects');
    expect(node.isPartOf).toEqual({ '@id': LD.blog });
    expect(node.encoding).toMatchObject({
      encodingFormat: 'application/pdf',
      contentUrl: `${SITE}/timeline/pdf/260913_statusbar.pdf`,
    });
    // The summary on the list page leaves the page-only claims out.
    const brief = blogPostingNode(post);
    expect(brief.mainEntityOfPage).toBeUndefined();
    expect(brief.encoding).toBeUndefined();
  });

  it('leaves a post with an unknown tag its keyword but no concept', () => {
    const node = blogPostingNode({ ...post, category: 'Tech' });
    expect(node.keywords).toBe('tech');
    expect(node.about).toBeUndefined();
  });

  it('describes the timeline as a Blog of every post', () => {
    const nodes = timelineGraph([post, { ...post, slug: '/other/' }]);
    const blog = nodes.find(n => n['@id'] === LD.blog) as JsonLdNode;
    expect(blog.blogPost).toEqual([
      { '@id': LD.post('/260913_statusbar/') },
      { '@id': LD.post('/other/') },
    ]);
    expect(byType(nodes, 'BlogPosting')).toHaveLength(2);
    const page = nodes.find(
      n => n['@id'] === pageUrl('/timeline')
    ) as JsonLdNode;
    expect(page['@type']).toBe('CollectionPage');
  });

  it('gives a post page a three-step breadcrumb', () => {
    const nodes = postGraph(post);
    const crumbs = byType(nodes, 'BreadcrumbList')[0];
    const items = crumbs.itemListElement as JsonLdNode[];
    expect(items.map(i => i.item)).toEqual([
      `${SITE}/`,
      `${SITE}/timeline/`,
      `${SITE}/timeline/260913_statusbar/`,
    ]);
    expect(items.map(i => i.position)).toEqual([1, 2, 3]);
    expect(breadcrumbNode('/x', [])['@id']).toBe(`${SITE}/x/#breadcrumb`);
  });

  it('describes every project as source code about a concept', () => {
    const nodes = projectsGraph();
    const projects = byType(nodes, 'SoftwareSourceCode');
    expect(projects).toHaveLength(projectsConfig.projects.length);
    for (const node of projects) {
      expect(node.codeRepository).toMatch(/^https:\/\/github\.com\//);
      expect(node.author).toEqual({ '@id': LD.person });
      expect(node.about).toBeDefined();
    }
    const list = nodes.find(n => n['@id'] === LD.projects) as JsonLdNode;
    expect(list.numberOfItems).toBe(projectsConfig.projects.length);
    expect((list.itemListElement as JsonLdNode[])[0].item).toBe(
      LD.project(projectsConfig.projects[0].name)
    );
  });

  it('counts stars as an interaction and prefers the project site as its url', () => {
    const starred = projectNode({
      name: 'x',
      description: 'd',
      language: 'Rust',
      tags: ['t'],
      url: 'https://github.com/alexnodeland/x',
      site: 'https://x.run/',
      stars: 12,
      category: 'math',
    });
    expect(starred.url).toBe('https://x.run/');
    expect(starred.interactionStatistic).toMatchObject({
      userInteractionCount: 12,
    });
    const bare = projectNode({
      name: 'y',
      description: 'd',
      language: 'Rust',
      tags: [],
      url: 'https://github.com/alexnodeland/y',
      category: 'misc',
    });
    expect(bare.url).toBe('https://github.com/alexnodeland/y');
    expect(bare.interactionStatistic).toBeUndefined();
  });

  it('describes consulting as a service with a booking action and its steps', () => {
    const nodes = consultingGraph();
    const service = nodes.find(n => n['@id'] === LD.consulting) as JsonLdNode;
    expect(service.provider).toEqual({ '@id': LD.person });
    expect(service.potentialAction).toMatchObject({
      '@type': 'ScheduleAction',
      target: siteConfig.services.calendar,
    });
    const howTo = nodes.find(n => n['@id'] === LD.engagement) as JsonLdNode;
    expect(howTo['@type']).toBe('HowTo');
    expect((howTo.step as JsonLdNode[]).length).toBeGreaterThan(0);
  });

  it('gives the cv and vocab pages a page node each, and a breadcrumb', () => {
    for (const nodes of [cvGraph(), vocabGraph()]) {
      expect(byType(nodes, 'BreadcrumbList')).toHaveLength(1);
      expect(
        nodes.filter(n =>
          ['WebPage', 'ProfilePage', 'CollectionPage'].includes(
            n['@type'] as string
          )
        )
      ).toHaveLength(1);
    }
  });
});

describe('documents', () => {
  it('uses the one-line schema.org context unless a node needs a prefix', () => {
    expect(jsonLdDocument(homeGraph())['@context']).toBe('https://schema.org');
    expect(jsonLdDocument(vocabGraph())['@context']).toEqual([
      'https://schema.org',
      expect.objectContaining({ skos: 'http://www.w3.org/2004/02/skos/core#' }),
    ]);
  });

  it('merges nodes that share an id, unioning their lists', () => {
    const merged = mergeNodes([
      { '@id': 'a', '@type': 'Person', name: 'x', sameAs: ['1'] },
      { '@id': 'a', sameAs: ['1', '2'], jobTitle: 'y' },
      { '@type': 'Thing' },
    ]);
    expect(merged).toEqual([
      {
        '@id': 'a',
        '@type': 'Person',
        name: 'x',
        sameAs: ['1', '2'],
        jobTitle: 'y',
      },
      { '@type': 'Thing' },
    ]);
  });

  it('every reference in the whole graph resolves to a node in it', () => {
    // The dumps are built from exactly these; a dangling @id would be a URI
    // that dereferences to nothing.
    const posts = [
      { slug: '/p/', title: 'p', date: '2020-01-01', category: 'Notes' },
    ];
    const all = mergeNodes([
      ...homeGraph(),
      ...timelineGraph(posts),
      ...posts.flatMap(postGraph),
      ...projectsGraph(),
      ...cvGraph(),
      ...consultingGraph(),
      ...vocabGraph(),
    ]);
    const known = new Set(ids(all));
    const refs = new Set<string>();
    const walk = (value: unknown) => {
      if (Array.isArray(value)) return value.forEach(walk);
      if (value && typeof value === 'object') {
        const node = value as JsonLdNode;
        if (node['@id'] && Object.keys(node).length === 1)
          refs.add(node['@id']);
        Object.values(node).forEach(walk);
      }
    };
    all.forEach(walk);
    for (const ref of Array.from(refs)) {
      expect(known.has(ref)).toBe(true);
    }
  });
});
