import { CVData, cvData, cvPdfPath } from './cv';
import { homepageConfig } from './homepage';
import { GitHubProject, projectsConfig } from './projects';
import { siteConfig } from './site';

/**
 * The site as a graph.
 *
 * Everything the visible pages say about the person, the posts, the projects
 * and the CV is said once more here in the form a machine reads: schema.org
 * nodes, each with a stable URI, that every page embeds as JSON-LD and that
 * `scripts/build-linked-data.mjs` serialises whole as Turtle and JSON-LD
 * dumps. The page builders and the dumps share these functions, so the
 * snippet on a page and the triple in the dump cannot disagree.
 *
 * Identity is the point. A page's snippet on its own is an SEO annotation;
 * the same Person node with the same `@id` on every page, referenced by the
 * posts it wrote and the projects it made, is a graph a consumer can merge.
 * The URIs are fragment identifiers on the pages that describe them — the
 * person is `/#me`, a post is its page plus `#post`, a concept is `/vocab/#ai`
 * — so each one dereferences to a page that carries its own description.
 *
 * Vocabularies: schema.org for everything it covers; SKOS for the concept
 * scheme the site is organised by (see `VOCABULARY`); FOAF, PROV and VoID
 * only in the dumps, where a consumer of those vocabularies would look.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A reference to another node, by URI. */
export interface JsonLdRef {
  '@id': string;
}

/** A language-tagged string. */
export interface JsonLdLangString {
  '@value': string;
  '@language': string;
}

export type JsonLdValue =
  | string
  | number
  | boolean
  | JsonLdRef
  | JsonLdLangString
  | JsonLdNode
  | JsonLdValue[];

/**
 * One node of the graph. `@id` is optional only for the nested objects that
 * are a property's value (a PostalAddress, a ListItem) and are never
 * referenced from anywhere else.
 */
export interface JsonLdNode {
  '@id'?: string;
  '@type'?: string | string[];
  [property: string]: JsonLdValue | undefined;
}

/** A JSON-LD document: a context and a graph of nodes. */
export interface JsonLdDocument {
  '@context': string | Array<string | Record<string, unknown>>;
  '@graph': JsonLdNode[];
}

// ---------------------------------------------------------------------------
// Contexts
// ---------------------------------------------------------------------------

/**
 * The prefixes the nodes may use beside schema.org's own terms. A node
 * written with `skos:prefLabel` means exactly that; the context resolves the
 * prefix and schema.org supplies every unprefixed term.
 */
export const LD_PREFIXES: Record<string, string> = {
  skos: 'http://www.w3.org/2004/02/skos/core#',
  foaf: 'http://xmlns.com/foaf/0.1/',
  dcterms: 'http://purl.org/dc/terms/',
  prov: 'http://www.w3.org/ns/prov#',
  void: 'http://rdfs.org/ns/void#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
};

/** The context of a document that uses only schema.org terms. */
export const SCHEMA_CONTEXT = 'https://schema.org';

/**
 * The schema.org properties whose string values are URIs rather than text.
 * The convention every schema.org snippet on the web follows is to write
 * these as plain strings (`"url": "https://…"`), and search engines read them
 * that way; schema.org's own context leaves them untyped, so a strict JSON-LD
 * processor would read them as literals. The full context below types them
 * as `@id`, so the dumps expand to the same IRIs the Turtle states; the RDF
 * serialiser reads the same list. Anywhere else a reference is written as
 * `{ '@id': ... }`.
 */
export const SCHEMA_IRI_PROPERTIES = [
  'url',
  'sameAs',
  'codeRepository',
  'contentUrl',
  'image',
  'license',
  'mainEntityOfPage',
  'item',
  'target',
  'additionalType',
  'interactionType',
  'archivedAt',
];

/**
 * The context of a document that also uses the prefixed vocabularies: the
 * prefixes, and the IRI typing of the properties above. (`schema:` is a
 * prefix schema.org's context itself declares.)
 */
export const FULL_CONTEXT: JsonLdDocument['@context'] = [
  SCHEMA_CONTEXT,
  {
    ...LD_PREFIXES,
    ...Object.fromEntries(
      SCHEMA_IRI_PROPERTIES.map(property => [
        property,
        { '@id': `schema:${property}`, '@type': '@id' },
      ])
    ),
  },
];

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

const SITE = siteConfig.siteUrl;

/** A page's canonical URL: the site plus the path, with the trailing slash. */
export const pageUrl = (path: string = '/'): string => {
  const trimmed = path.replace(/^\/+|\/+$/g, '');
  return trimmed === '' ? `${SITE}/` : `${SITE}/${trimmed}/`;
};

/** A safe fragment for a name: lowercase, hyphenated, nothing else. */
export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Every URI the graph mints, in one place. The fragments are on the pages
 * that describe their subject, so each URI dereferences to a page carrying
 * its own JSON-LD; the machine-readable forms are linked from those pages as
 * alternates.
 */
export const LD = {
  site: `${SITE}/`,
  person: `${SITE}/#me`,
  website: `${SITE}/#website`,
  dataset: `${SITE}/#dataset`,
  blog: `${pageUrl('/timeline')}#blog`,
  projects: `${pageUrl('/projects')}#collection`,
  consulting: `${pageUrl('/consulting')}#service`,
  engagement: `${pageUrl('/consulting')}#engagement`,
  scheme: `${pageUrl('/vocab')}#scheme`,
  concept: (id: string): string => `${pageUrl('/vocab')}#${id}`,
  collection: (id: string): string => `${pageUrl('/vocab')}#${id}-collection`,
  post: (slug: string): string => `${postUrl(slug)}#post`,
  project: (name: string): string =>
    `${pageUrl('/projects')}#project-${slugify(name)}`,
  role: (index: number): string => `${pageUrl('/cv')}#role-${index + 1}`,
  degree: (index: number): string => `${pageUrl('/cv')}#degree-${index + 1}`,
  organization: (name: string): string => `${SITE}/#org-${slugify(name)}`,
  breadcrumb: (path: string): string => `${pageUrl(path)}#breadcrumb`,
  feed: `${SITE}/rss.xml`,
  profileTurtle: `${SITE}/me.ttl`,
  profileJsonLd: `${SITE}/me.jsonld`,
  vocabTurtle: `${SITE}/vocab.ttl`,
  vocabJsonLd: `${SITE}/vocab.jsonld`,
  graphTurtle: `${SITE}/graph.ttl`,
  graphJsonLd: `${SITE}/graph.jsonld`,
  provenanceTurtle: `${SITE}/provenance.ttl`,
  provenanceJsonLd: `${SITE}/provenance.jsonld`,
  void: `${SITE}/void.ttl`,
};

/** A post's page. `slug` is Gatsby's, with or without its slashes. */
export function postUrl(slug: string): string {
  return pageUrl(`/timeline/${slug.replace(/^\/+|\/+$/g, '')}`);
}

/** Where a post's typeset PDF is served from (see scripts/build-post-pdfs.js). */
export function postPdfUrl(slug: string): string {
  return `${SITE}/timeline/pdf/${slug.replace(/\//g, '')}.pdf`;
}

/** The reference every other node makes to the person. */
export const personRef = (): JsonLdRef => ({ '@id': LD.person });

// ---------------------------------------------------------------------------
// The vocabulary
// ---------------------------------------------------------------------------

/**
 * The site's own concept scheme.
 *
 * The site already sorts things into a handful of categories — the projects
 * page's sections, the timeline's tags, the audiences a CV bullet is written
 * for — as strings in three different config files. This is those strings as
 * SKOS concepts with a URI, a definition and their relations, so a project
 * tagged `ai` and a post tagged `Projects` point at something a consumer can
 * dereference rather than a word it has to guess at.
 *
 * `music` is one concept used from two places: the timeline's Music tag and
 * the music-tech audience. Both mean the same subject.
 *
 * A category used anywhere in the config must have a concept here; the
 * config test holds it to that, and the build warns on a post whose category
 * has none.
 */
export interface Concept {
  /** The fragment on /vocab/, and the string the config files use. */
  id: string;
  prefLabel: string;
  altLabels?: string[];
  definition: string;
  related?: string[];
}

export interface ConceptCollection {
  id: string;
  label: string;
  description: string;
  members: string[];
}

export const VOCABULARY: {
  title: string;
  description: string;
  concepts: Concept[];
  collections: ConceptCollection[];
} = {
  title: 'vocabulary',
  description:
    'the concepts this site is organised by: what the projects are about, what the posts are about, and who a line of the cv is written for.',
  concepts: [
    {
      id: 'ai',
      prefLabel: 'ai',
      altLabels: ['artificial intelligence', 'machine learning'],
      definition:
        'machine learning and llm systems: agents, evaluation, retrieval, and the infrastructure they run on.',
      related: ['ai-eng', 'fde'],
    },
    {
      id: 'math',
      prefLabel: 'math',
      altLabels: ['mathematics', 'applied mathematics'],
      definition:
        'applied mathematics: probability, numerical methods, wavelets, and the libraries built on them.',
      related: ['audio-dsp'],
    },
    {
      id: 'audio-dsp',
      prefLabel: 'audio dsp',
      altLabels: ['audio signal processing', 'digital signal processing'],
      definition:
        'audio signal processing: synthesis, compression, real-time audio, and the tools around them.',
      related: ['math', 'music'],
    },
    {
      id: 'distributed-systems',
      prefLabel: 'distributed systems',
      altLabels: ['hpc', 'high-performance computing'],
      definition:
        'distributed systems and high-performance computing: clusters, orchestration, and software that runs across many machines.',
      related: ['hardware'],
    },
    {
      id: 'misc',
      prefLabel: 'misc',
      definition: 'projects that fit none of the other categories.',
    },
    {
      id: 'music',
      prefLabel: 'music',
      altLabels: ['music technology'],
      definition:
        'music: performance, composition, and the technology of making and analysing it.',
      related: ['audio-dsp'],
    },
    {
      id: 'notes',
      prefLabel: 'notes',
      definition:
        'shorter writing: a thought, an update, a thing worth writing down.',
    },
    {
      id: 'press',
      prefLabel: 'press',
      definition:
        'coverage elsewhere: features, interviews and announcements about the work.',
    },
    {
      id: 'projects',
      prefLabel: 'projects',
      definition: 'writing about something built: what it is, why, and how.',
    },
    {
      id: 'fde',
      prefLabel: 'forward-deployed engineering',
      altLabels: ['fde'],
      definition:
        'taking an llm system from a prototype to something that holds up in front of customers.',
      related: ['ai', 'ai-eng'],
    },
    {
      id: 'ai-eng',
      prefLabel: 'ai engineering',
      definition:
        'building and running the systems a model is one part of: orchestration, evaluation, and the data underneath.',
      related: ['ai', 'fde'],
    },
    {
      id: 'exec',
      prefLabel: 'executive',
      altLabels: ['founder'],
      definition:
        'founder and executive work: fundraising, boards, investors, and running a company.',
    },
    {
      id: 'hardware',
      prefLabel: 'hardware',
      definition:
        'hardware and infrastructure: supercomputers, clusters, and the machines underneath the software.',
      related: ['distributed-systems'],
    },
  ],
  collections: [
    {
      id: 'project-categories',
      label: 'project categories',
      description: 'the sections of the projects page.',
      members: ['ai', 'math', 'audio-dsp', 'distributed-systems', 'misc'],
    },
    {
      id: 'post-categories',
      label: 'post categories',
      description: 'the tags the timeline is filtered by.',
      members: ['music', 'notes', 'press', 'projects'],
    },
    {
      id: 'audiences',
      label: 'audiences',
      description:
        'who a line of the cv is written for; each role page selects by one of these.',
      members: ['fde', 'ai-eng', 'music', 'exec', 'hardware'],
    },
  ],
};

/** The concept a config string names, if there is one. Case-insensitive. */
export function conceptFor(category: string): Concept | undefined {
  const key = slugify(category);
  return VOCABULARY.concepts.find(c => c.id === key);
}

/** A reference to a category's concept, when the vocabulary has it. */
export function conceptRef(category: string): JsonLdRef | undefined {
  const concept = conceptFor(category);
  return concept ? { '@id': LD.concept(concept.id) } : undefined;
}

/** The SKOS nodes: the scheme, its collections and every concept. */
export function vocabularyNodes(): JsonLdNode[] {
  const scheme: JsonLdNode = {
    '@id': LD.scheme,
    '@type': 'skos:ConceptScheme',
    'skos:prefLabel': lang(VOCABULARY.title),
    'skos:definition': lang(VOCABULARY.description),
    'dcterms:creator': personRef(),
    'skos:hasTopConcept': VOCABULARY.concepts.map(c => ({
      '@id': LD.concept(c.id),
    })),
  };

  const concepts: JsonLdNode[] = VOCABULARY.concepts.map(c => {
    const node: JsonLdNode = {
      '@id': LD.concept(c.id),
      '@type': 'skos:Concept',
      'skos:prefLabel': lang(c.prefLabel),
      'skos:definition': lang(c.definition),
      'skos:inScheme': { '@id': LD.scheme },
      'skos:topConceptOf': { '@id': LD.scheme },
      'skos:notation': c.id,
    };
    if (c.altLabels?.length) node['skos:altLabel'] = c.altLabels.map(lang);
    if (c.related?.length)
      node['skos:related'] = c.related.map(id => ({ '@id': LD.concept(id) }));
    return node;
  });

  const collections: JsonLdNode[] = VOCABULARY.collections.map(col => ({
    '@id': LD.collection(col.id),
    '@type': 'skos:Collection',
    'skos:prefLabel': lang(col.label),
    'skos:definition': lang(col.description),
    'skos:inScheme': { '@id': LD.scheme },
    'skos:member': col.members.map(id => ({ '@id': LD.concept(id) })),
  }));

  return [scheme, ...collections, ...concepts];
}

const lang = (value: string): JsonLdLangString => ({
  '@value': value,
  '@language': 'en',
});

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const MONTHS: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

/** "Jan 2018" → "2018-01"; "2018" → "2018"; anything else → undefined. */
export function isoDate(text: string): string | undefined {
  const trimmed = text.trim();
  if (/^\d{4}$/.test(trimmed)) return trimmed;
  const monthYear = /^([A-Za-z]{3})[a-z]*\.?\s+(\d{4})$/.exec(trimmed);
  if (monthYear) {
    const month = MONTHS[monthYear[1].toLowerCase()];
    if (month) return `${monthYear[2]}-${month}`;
  }
  return undefined;
}

/**
 * A CV duration ("2016 - 2017", "Jan 2018 - Jun 2018", "2024 - Present") as
 * the ISO start and end schema.org wants. An open range has no end.
 */
export function isoDateRange(duration: string): {
  startDate?: string;
  endDate?: string;
} {
  const [start = '', end = ''] = duration.split(/\s*[-–—]\s*/);
  const range: { startDate?: string; endDate?: string } = {};
  const startDate = isoDate(start);
  if (startDate) range.startDate = startDate;
  if (end && !/^(present|current|now)$/i.test(end)) {
    const endDate = isoDate(end);
    if (endDate) range.endDate = endDate;
  }
  return range;
}

/** A frontmatter date, however Gatsby hands it over, as YYYY-MM-DD. */
export function isoDay(date: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(date);
  return match ? match[1] : date;
}

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

/** The site itself. */
export function websiteNode(): JsonLdNode {
  return {
    '@id': LD.website,
    '@type': 'WebSite',
    name: siteConfig.siteName,
    url: LD.site,
    description: siteConfig.description,
    inLanguage: 'en',
    author: personRef(),
    publisher: personRef(),
    copyrightHolder: personRef(),
    image: `${SITE}${siteConfig.seo.defaultImage}`,
  };
}

/**
 * A page of the site, as a node the page's other nodes hang off. `type` is
 * the schema.org page type — ProfilePage, CollectionPage, or the plain one.
 */
export function webPageNode(options: {
  path: string;
  name: string;
  description: string;
  type?: 'WebPage' | 'ProfilePage' | 'CollectionPage' | 'AboutPage';
  mainEntity?: JsonLdRef;
  datePublished?: string;
}): JsonLdNode {
  const url = pageUrl(options.path);
  const node: JsonLdNode = {
    '@id': url,
    '@type': options.type ?? 'WebPage',
    url,
    name: options.name,
    description: options.description,
    inLanguage: 'en',
    isPartOf: { '@id': LD.website },
    author: personRef(),
    breadcrumb: { '@id': LD.breadcrumb(options.path) },
  };
  if (options.mainEntity) node.mainEntity = options.mainEntity;
  if (options.datePublished) node.datePublished = options.datePublished;
  return node;
}

/** The trail from the front page to a page, as schema.org spells it. */
export function breadcrumbNode(
  path: string,
  trail: Array<{ name: string; path: string }>
): JsonLdNode {
  return {
    '@id': LD.breadcrumb(path),
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: pageUrl(crumb.path),
    })),
  };
}

const organizationNode = (name: string, location?: string): JsonLdNode => {
  const node: JsonLdNode = {
    '@id': LD.organization(name),
    '@type': 'Organization',
    name,
  };
  if (location) node.location = { '@type': 'Place', name: location };
  return node;
};

/** "Stamford, NY" → a PostalAddress. Anything less structured stays a name. */
const addressNode = (location: string): JsonLdNode => {
  const parts = location.split(',').map(s => s.trim());
  const node: JsonLdNode = { '@type': 'PostalAddress', addressCountry: 'US' };
  if (parts.length >= 2) {
    node.addressLocality = parts[0];
    node.addressRegion = parts[1];
  } else {
    node.addressRegion = location;
  }
  return node;
};

/**
 * The person, in brief: what every page other than the CV says. Built from
 * the same config the visible pages use, so it cannot drift from them.
 */
export function personNode(data: CVData = cvData): JsonLdNode {
  const [givenName, ...rest] = data.personal.name.split(' ');
  const current = data.experience[0];
  return {
    '@id': LD.person,
    '@type': 'Person',
    name: data.personal.name,
    givenName,
    familyName: rest.join(' '),
    alternateName: siteConfig.author,
    url: LD.site,
    mainEntityOfPage: LD.site,
    email: `mailto:${siteConfig.contact.email}`,
    jobTitle: data.personal.title,
    description: data.personal.summary,
    worksFor: { '@id': LD.organization(current.company) },
    address: addressNode(data.personal.location),
    sameAs: [siteConfig.social.linkedin, siteConfig.social.github],
    knowsAbout: data.skills.technical,
    subjectOf: { '@id': pageUrl('/cv') },
  };
}

/**
 * The person in full — the CV as a graph. Roles are `OrganizationRole`s on
 * `worksFor`, schema.org's way of dating a relationship; degrees and
 * certifications are credentials; the institutions are `alumniOf`.
 */
export function cvNodes(data: CVData = cvData): JsonLdNode[] {
  const person = personNode(data);
  const organizations = new Map<string, JsonLdNode>();
  const org = (name: string, location?: string): JsonLdRef => {
    if (!organizations.has(name))
      organizations.set(name, organizationNode(name, location));
    return { '@id': LD.organization(name) };
  };

  const roles: JsonLdNode[] = data.experience.map((role, index) => {
    const node: JsonLdNode = {
      '@id': LD.role(index),
      '@type': 'OrganizationRole',
      roleName: role.title,
      worksFor: org(role.company, role.location),
      ...isoDateRange(role.duration),
    };
    if (role.description) node.description = role.description;
    if (role.skills?.length) node.skills = role.skills;
    return node;
  });

  const degrees: JsonLdNode[] = data.education.map((edu, index) => {
    const node: JsonLdNode = {
      '@id': LD.degree(index),
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'degree',
      name: edu.degree,
      recognizedBy: org(edu.institution, edu.location),
      ...isoDateRange(edu.duration),
    };
    if (edu.description) node.description = edu.description;
    if (edu.relevantCoursework?.length) node.teaches = edu.relevantCoursework;
    return node;
  });

  const certifications: JsonLdNode[] = data.certifications.map(cert => {
    const node: JsonLdNode = {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'certification',
      name: cert.name,
      recognizedBy: org(cert.issuer),
      dateCreated: cert.date,
    };
    if (cert.url) node.url = cert.url;
    if (cert.credentialId) node.identifier = cert.credentialId;
    return node;
  });

  const publications: JsonLdNode[] = (data.publications ?? []).map(pub => {
    const node: JsonLdNode = {
      '@type': 'ScholarlyArticle',
      headline: pub.title,
      author: pub.authors,
      isPartOf: { '@type': 'Periodical', name: pub.journal },
      datePublished: pub.year,
    };
    if (pub.url) node.url = pub.url;
    return node;
  });

  const full: JsonLdNode = {
    ...person,
    worksFor: roles.map(role => ({ '@id': role['@id'] as string })),
    alumniOf: data.education
      .map(edu => edu.institution)
      .filter((name, i, all) => all.indexOf(name) === i)
      .map(name => ({ '@id': LD.organization(name) })),
    hasCredential: [
      ...degrees.map(degree => ({ '@id': degree['@id'] as string })),
      ...certifications,
    ],
    hasOccupation: {
      '@type': 'Occupation',
      name: data.personal.title,
      occupationLocation: { '@type': 'Place', name: data.personal.location },
    },
  };
  if (data.awards?.length) full.award = data.awards.map(a => a.name);
  if (data.skills.languages?.length) full.knowsLanguage = data.skills.languages;

  // The CV also exists as a typeset document; the page says so.
  const pdf: JsonLdNode = {
    '@type': 'DigitalDocument',
    name: `${data.personal.name} — CV`,
    url: `${SITE}${cvPdfPath('full')}`,
    encodingFormat: 'application/pdf',
    about: personRef(),
  };

  return [
    { ...full, hasPart: [...publications, pdf] },
    ...roles,
    ...degrees,
    ...Array.from(organizations.values()),
  ];
}

/** What a post looks like to the builders, whichever source it came from. */
export interface PostSummary {
  slug: string;
  title: string;
  date: string;
  description?: string;
  category?: string;
}

/** The timeline, as a Blog whose posts are the given ones. */
export function blogNode(posts: PostSummary[] = []): JsonLdNode {
  return {
    '@id': LD.blog,
    '@type': 'Blog',
    name: 'timeline',
    url: pageUrl('/timeline'),
    description: 'things built, played, and written about.',
    inLanguage: 'en',
    author: personRef(),
    publisher: personRef(),
    isPartOf: { '@id': LD.website },
    blogPost: posts.map(post => ({ '@id': LD.post(post.slug) })),
  };
}

/**
 * A post. `full` adds what only the post's own page says: that it is the
 * page's main entity, and the PDF it is also typeset as.
 */
export function blogPostingNode(
  post: PostSummary,
  { full = false }: { full?: boolean } = {}
): JsonLdNode {
  const url = postUrl(post.slug);
  const node: JsonLdNode = {
    '@id': LD.post(post.slug),
    '@type': 'BlogPosting',
    headline: post.title,
    url,
    datePublished: isoDay(post.date),
    inLanguage: 'en',
    author: personRef(),
    publisher: personRef(),
    isPartOf: { '@id': LD.blog },
  };
  if (post.description) node.description = post.description;
  if (post.category) {
    node.keywords = post.category.toLowerCase();
    node.articleSection = post.category.toLowerCase();
    const concept = conceptRef(post.category);
    if (concept) node.about = concept;
  }
  if (full) {
    node.mainEntityOfPage = url;
    node.encoding = {
      '@type': 'MediaObject',
      encodingFormat: 'application/pdf',
      contentUrl: postPdfUrl(post.slug),
    };
  }
  return node;
}

/** A project, as the source code it is. */
export function projectNode(project: GitHubProject): JsonLdNode {
  const node: JsonLdNode = {
    '@id': LD.project(project.name),
    '@type': 'SoftwareSourceCode',
    name: project.name,
    description: project.description,
    codeRepository: project.url,
    url: project.site ?? project.url,
    programmingLanguage: {
      '@type': 'ComputerLanguage',
      name: project.language,
    },
    keywords: project.tags,
    author: personRef(),
    isPartOf: { '@id': LD.projects },
  };
  const concept = conceptRef(project.category);
  if (concept) node.about = concept;
  if (typeof project.stars === 'number' && project.stars > 0) {
    node.interactionStatistic = {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/LikeAction',
      userInteractionCount: project.stars,
    };
  }
  return node;
}

/** The projects page's list: every project, in the page's order. */
export function projectsCollectionNode(
  projects: GitHubProject[] = projectsConfig.projects
): JsonLdNode {
  return {
    '@id': LD.projects,
    '@type': 'ItemList',
    name: projectsConfig.title,
    description: projectsConfig.subtitle,
    numberOfItems: projects.length,
    itemListOrder: 'https://schema.org/ItemListUnordered',
    itemListElement: projects.map((project, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: LD.project(project.name),
    })),
  };
}

/**
 * Consulting: a Service the person provides, and the way an engagement runs
 * as the HowTo it is. The case studies are not here — no client is named on
 * the page, and a CreativeWork about an anonymous client says nothing.
 */
export function consultingNodes(): JsonLdNode[] {
  const { consulting } = homepageConfig;
  const service: JsonLdNode = {
    '@id': LD.consulting,
    '@type': 'Service',
    name: consulting.title,
    serviceType: 'ai engineering consulting',
    description: consulting.description,
    provider: personRef(),
    url: pageUrl('/consulting'),
    potentialAction: {
      '@type': 'ScheduleAction',
      name: 'book a call',
      target: siteConfig.services.calendar,
    },
    hasPart: { '@id': LD.engagement },
  };
  const engagement: JsonLdNode = {
    '@id': LD.engagement,
    '@type': 'HowTo',
    name: 'how an engagement runs',
    step: consulting.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.title,
      text: step.body,
    })),
  };
  return [service, engagement];
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

const HOME_CRUMB = { name: siteConfig.siteName, path: '/' };

/** The front page: the site, and the person it is about. */
export function homeGraph(): JsonLdNode[] {
  return [
    websiteNode(),
    personNode(),
    webPageNode({
      path: '/',
      name: siteConfig.siteName,
      description: siteConfig.description,
      type: 'ProfilePage',
      mainEntity: personRef(),
    }),
    breadcrumbNode('/', [HOME_CRUMB]),
  ];
}

/** The timeline: the blog and a summary of every post on it. */
export function timelineGraph(posts: PostSummary[]): JsonLdNode[] {
  return [
    blogNode(posts),
    ...posts.map(post => blogPostingNode(post)),
    webPageNode({
      path: '/timeline',
      name: 'timeline',
      description: 'things built, played, and written about.',
      type: 'CollectionPage',
      mainEntity: { '@id': LD.blog },
    }),
    breadcrumbNode('/timeline', [
      HOME_CRUMB,
      { name: 'timeline', path: '/timeline' },
    ]),
  ];
}

/** One post's page. */
export function postGraph(post: PostSummary): JsonLdNode[] {
  const path = `/timeline/${post.slug.replace(/^\/+|\/+$/g, '')}`;
  return [
    blogPostingNode(post, { full: true }),
    webPageNode({
      path,
      name: post.title,
      description: post.description ?? '',
      mainEntity: { '@id': LD.post(post.slug) },
      datePublished: isoDay(post.date),
    }),
    breadcrumbNode(path, [
      HOME_CRUMB,
      { name: 'timeline', path: '/timeline' },
      { name: post.title, path },
    ]),
  ];
}

/** The projects page: the list, and every project on it. */
export function projectsGraph(
  projects: GitHubProject[] = projectsConfig.projects
): JsonLdNode[] {
  return [
    projectsCollectionNode(projects),
    ...projects.map(projectNode),
    webPageNode({
      path: '/projects',
      name: projectsConfig.title,
      description: projectsConfig.subtitle,
      type: 'CollectionPage',
      mainEntity: { '@id': LD.projects },
    }),
    breadcrumbNode('/projects', [
      HOME_CRUMB,
      { name: 'projects', path: '/projects' },
    ]),
  ];
}

/** The CV page: the person in full. */
export function cvGraph(data: CVData = cvData): JsonLdNode[] {
  return [
    ...cvNodes(data),
    webPageNode({
      path: '/cv',
      name: 'cv',
      description: `Complete resume and CV for ${data.personal.name}`,
      type: 'ProfilePage',
      mainEntity: personRef(),
    }),
    breadcrumbNode('/cv', [HOME_CRUMB, { name: 'cv', path: '/cv' }]),
  ];
}

/** The consulting page. */
export function consultingGraph(): JsonLdNode[] {
  return [
    ...consultingNodes(),
    webPageNode({
      path: '/consulting',
      name: 'consulting',
      description: homepageConfig.consulting.description,
      mainEntity: { '@id': LD.consulting },
    }),
    breadcrumbNode('/consulting', [
      HOME_CRUMB,
      { name: 'consulting', path: '/consulting' },
    ]),
  ];
}

/** The vocabulary page: the scheme, in SKOS. */
export function vocabGraph(): JsonLdNode[] {
  return [
    ...vocabularyNodes(),
    webPageNode({
      path: '/vocab',
      name: VOCABULARY.title,
      description: VOCABULARY.description,
      mainEntity: { '@id': LD.scheme },
    }),
    breadcrumbNode('/vocab', [HOME_CRUMB, { name: 'vocab', path: '/vocab' }]),
  ];
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

const PREFIXED = new RegExp(`"(${Object.keys(LD_PREFIXES).join('|')}):`);

/**
 * Nodes as one JSON-LD document. The context is schema.org alone unless a
 * node uses a prefixed term, so the pages that only speak schema.org carry
 * the one-line context every consumer understands.
 */
export function jsonLdDocument(nodes: JsonLdNode[]): JsonLdDocument {
  const usesPrefixes = PREFIXED.test(JSON.stringify(nodes));
  return {
    '@context': usesPrefixes ? FULL_CONTEXT : SCHEMA_CONTEXT,
    '@graph': nodes,
  };
}

/**
 * Nodes with the same `@id`, merged: the properties of the later one win and
 * array values are unioned, so the brief Person on the front page and the
 * full one on the CV become one node in the dump.
 */
export function mergeNodes(nodes: JsonLdNode[]): JsonLdNode[] {
  const byId = new Map<string, JsonLdNode>();
  const anonymous: JsonLdNode[] = [];
  for (const node of nodes) {
    const id = node['@id'];
    if (!id) {
      anonymous.push(node);
      continue;
    }
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, { ...node });
      continue;
    }
    for (const [key, value] of Object.entries(node)) {
      if (value === undefined) continue;
      const current = existing[key];
      if (Array.isArray(current) && Array.isArray(value)) {
        const seen = new Set(current.map(v => JSON.stringify(v)));
        existing[key] = [
          ...current,
          ...value.filter(v => !seen.has(JSON.stringify(v))),
        ];
      } else {
        existing[key] = value;
      }
    }
  }
  return [...Array.from(byId.values()), ...anonymous];
}
