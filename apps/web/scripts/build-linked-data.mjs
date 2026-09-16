#!/usr/bin/env node
/**
 * The site as RDF, written out for anything that reads Turtle or JSON-LD
 * rather than HTML.
 *
 * Every page embeds its own JSON-LD (see src/config/linked-data.ts); these
 * files are the same nodes, whole, at stable addresses beside the pages:
 *
 *   /me.ttl, /me.jsonld           the FOAF + schema.org profile of /#me
 *   /vocab.ttl, /vocab.jsonld     the SKOS concept scheme behind /vocab/
 *   /graph.ttl, /graph.jsonld     everything: person, posts, projects, cv
 *   /provenance.ttl, .jsonld      PROV-O: how the site model was derived
 *   /void.ttl, /.well-known/void  VoID: what the dataset is, where it is
 *
 * Built from the same config and markdown the pages render, by the same
 * builders, so the dump and the pages cannot disagree. Deterministic: no
 * timestamps, stable order, the same bytes for the same content.
 *
 * Runs before `gatsby build` (see package.json) and writes into static/,
 * from where Gatsby ships the files untouched. The outputs are ignored by
 * git like the other generated artifacts there.
 *
 * Usage: node scripts/build-linked-data.mjs [--out <dir>]   (default: static)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import matter from 'gray-matter';
import { PREFIXES, summarize, toTriples, toTurtle } from './lib/rdf.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// The config is TypeScript with extensionless imports and a JSON import, which
// Node's own type stripping will not resolve; Babel's hook reads it the way
// Gatsby does (the same arrangement as scripts/lib/chat-corpus.mjs).
require('@babel/register')({
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  cwd: ROOT,
  only: [path.join(ROOT, 'src')],
});

const argv = process.argv.slice(2);
const outIndex = argv.indexOf('--out');
const OUT = path.resolve(
  ROOT,
  outIndex >= 0 && argv[outIndex + 1] ? argv[outIndex + 1] : 'static'
);

/** The model manifest the provenance graph describes, when the checkout has it. */
const MODEL_MANIFEST = path.join(
  ROOT,
  '..',
  'model',
  'models',
  'site-needle.json'
);

// --- Sources ----------------------------------------------------------------

const ld = require(path.join(ROOT, 'src/config/linked-data.ts'));
const { siteConfig } = require(path.join(ROOT, 'src/config/site.ts'));
const { cvData } = require(path.join(ROOT, 'src/config/cv.ts'));

const { LD, SCHEMA_IRI_PROPERTIES } = ld;
const SITE = siteConfig.siteUrl;

function posts() {
  const dir = path.join(ROOT, 'src/content/blog');
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .map(file => {
      const slug = file.replace(/\.md$/, '');
      const { data } = matter(fs.readFileSync(path.join(dir, file), 'utf8'));
      return {
        slug,
        title: data.title || slug,
        date:
          data.date instanceof Date
            ? data.date.toISOString().slice(0, 10)
            : String(data.date || ''),
        description: data.description || '',
        category: data.category || '',
      };
    });
}

// --- Nodes only the dumps carry ---------------------------------------------

const ref = id => ({ '@id': id });
const en = value => ({ '@value': value, '@language': 'en' });

const accountName = url => url.replace(/\/+$/, '').split('/').pop();
const serviceHome = url => `${new URL(url).origin}/`;

/**
 * The person in FOAF, on top of the schema.org node the pages carry. FOAF
 * is what a WebID consumer or an old-fashioned FOAF crawler reads, and its
 * account and homepage terms say things schema.org's `sameAs` flattens.
 */
function foafNodes() {
  const [givenName, ...rest] = cvData.personal.name.split(' ');
  const interests = ['ai', 'math', 'audio-dsp', 'distributed-systems'];
  return [
    {
      '@id': LD.person,
      '@type': ['Person', 'foaf:Person'],
      'foaf:name': cvData.personal.name,
      'foaf:givenName': givenName,
      'foaf:familyName': rest.join(' '),
      'foaf:nick': siteConfig.author,
      'foaf:homepage': ref(LD.site),
      'foaf:mbox': ref(`mailto:${siteConfig.contact.email}`),
      'foaf:weblog': ref(ld.pageUrl('/timeline')),
      'foaf:isPrimaryTopicOf': ref(LD.site),
      'foaf:topic_interest': interests.map(id => ref(LD.concept(id))),
      'foaf:account': Object.values(siteConfig.social)
        .filter(Boolean)
        .map(url => ({
          '@id': url,
          '@type': 'foaf:OnlineAccount',
          'foaf:accountServiceHomepage': ref(serviceHome(url)),
          'foaf:accountName': accountName(url),
        })),
    },
  ];
}

/** The profile document itself: what the file says it is. */
function profileDocument(id) {
  return {
    '@id': id,
    '@type': 'foaf:PersonalProfileDocument',
    'dcterms:title': en(`${siteConfig.siteName} — profile`),
    'foaf:maker': ref(LD.person),
    'foaf:primaryTopic': ref(LD.person),
    'dcterms:creator': ref(LD.person),
    'dcterms:language': 'en',
  };
}

/**
 * How the site's own model came to be, in PROV-O. The manifest in
 * apps/model/models is the record: the content snapshot the corpus was
 * built from, the corpus the run trained on, the run, and the model it
 * published. Each is an entity with the hash that identifies it, so the
 * chain from a sentence on this site to the weights on Hugging Face is
 * stated rather than assumed. Skipped, with a note, when the checkout has
 * no manifest.
 */
function provenanceNodes() {
  if (!fs.existsSync(MODEL_MANIFEST)) return null;
  const m = JSON.parse(fs.readFileSync(MODEL_MANIFEST, 'utf8'));
  const short = hash =>
    String(hash)
      .replace(/^sha256:/, '')
      .slice(0, 12);
  const model = `https://huggingface.co/${m.repo}`;
  const snapshot = `${SITE}/#content-${short(m.content_hash)}`;
  const corpus = `${SITE}/#corpus-${short(m.corpus_hash)}`;
  const run = `${SITE}/#training-run-${m.run_id}`;
  const dateTime = { '@value': m.published_at, '@type': 'xsd:dateTime' };

  return [
    {
      '@id': LD.person,
      '@type': ['Person', 'prov:Agent', 'prov:Person'],
    },
    {
      '@id': snapshot,
      '@type': ['prov:Entity', 'Dataset'],
      name: 'site content snapshot',
      description:
        'every piece of content on the site as one json file (scripts/export-site-content.mjs), hashed so a change to the site is a change to this.',
      identifier: m.content_hash,
      'prov:wasDerivedFrom': ref(LD.dataset),
      'prov:wasAttributedTo': ref(LD.person),
    },
    {
      '@id': corpus,
      '@type': ['prov:Entity', 'Dataset'],
      name: 'site-needle training corpus',
      description:
        'the extraction examples derived from the content snapshot that the site model is fine-tuned on.',
      identifier: [m.corpus_hash, `${m.dataset.repo}@${m.dataset.revision}`],
      'prov:wasDerivedFrom': ref(snapshot),
      'prov:wasAttributedTo': ref(LD.person),
    },
    {
      '@id': run,
      '@type': 'prov:Activity',
      name: 'site-needle fine-tune',
      identifier: m.run_id,
      'prov:used': ref(corpus),
      'prov:generated': ref(model),
      'prov:wasAssociatedWith': ref(LD.person),
      'prov:endedAtTime': dateTime,
    },
    {
      '@id': model,
      '@type': ['prov:Entity', 'SoftwareApplication'],
      name: 'site-needle',
      description:
        'the small model behind the in-browser chat: fine-tuned to answer questions about this site from its content.',
      url: m.resolve,
      version: m.revision,
      identifier: m.sha256,
      isBasedOn: ref(corpus),
      author: ref(LD.person),
      'prov:wasGeneratedBy': ref(run),
      'prov:wasDerivedFrom': ref(corpus),
      'prov:wasAttributedTo': ref(LD.person),
      'prov:generatedAtTime': dateTime,
    },
  ];
}

/**
 * The dataset, described in VoID and as a schema.org Dataset: what it
 * covers, which vocabularies it speaks, where its dumps are, how big it is.
 */
function datasetNode({ triples, entities }, subsets) {
  const formats = {
    ttl: 'http://www.w3.org/ns/formats/Turtle',
    jsonld: 'http://www.w3.org/ns/formats/JSON-LD',
  };
  const dump = (url, encodingFormat) => ({
    '@type': 'DataDownload',
    contentUrl: url,
    encodingFormat,
  });
  return {
    '@id': LD.dataset,
    '@type': ['void:Dataset', 'Dataset'],
    name: `${siteConfig.siteName} — linked data`,
    description:
      'everything this site says about its author, posts, projects and cv, as rdf: schema.org with skos, foaf, prov and dublin core.',
    url: LD.site,
    creator: ref(LD.person),
    publisher: ref(LD.person),
    isAccessibleForFree: true,
    inLanguage: 'en',
    distribution: [
      dump(LD.graphTurtle, 'text/turtle'),
      dump(LD.graphJsonLd, 'application/ld+json'),
    ],
    'dcterms:title': en(`${siteConfig.siteName} — linked data`),
    'dcterms:creator': ref(LD.person),
    'foaf:homepage': ref(LD.site),
    'void:uriSpace': `${SITE}/`,
    'void:rootResource': ref(LD.person),
    'void:exampleResource': [
      ref(LD.person),
      ref(LD.blog),
      ref(LD.projects),
      ref(LD.concept('ai')),
    ],
    'void:vocabulary': [
      ref(PREFIXES.schema),
      ref(PREFIXES.skos),
      ref(PREFIXES.foaf),
      ref(PREFIXES.dcterms),
      ref(PREFIXES.prov),
    ],
    'void:feature': [ref(formats.ttl), ref(formats.jsonld)],
    'void:dataDump': [ref(LD.graphTurtle), ref(LD.graphJsonLd)],
    'void:triples': triples,
    'void:entities': entities,
    'void:subset': subsets.map(s => ({
      '@id': s.id,
      '@type': 'void:Dataset',
      'dcterms:title': en(s.title),
      'void:dataDump': s.dumps.map(ref),
      'void:triples': s.triples,
    })),
  };
}

// --- Build --------------------------------------------------------------------

function main() {
  const allPosts = posts();

  const orphaned = allPosts
    .map(p => p.category)
    .filter((c, i, all) => c && all.indexOf(c) === i && !ld.conceptFor(c));
  for (const category of orphaned) {
    console.warn(
      `linked-data: post category "${category}" has no concept in src/config/linked-data.ts VOCABULARY; ` +
        'its posts carry the keyword but no skos:Concept.'
    );
  }

  const options = { iriProperties: SCHEMA_IRI_PROPERTIES };
  const serialise = nodes => {
    const triples = toTriples(nodes, options);
    return {
      nodes,
      triples,
      turtle: toTurtle(triples),
      size: summarize(triples),
    };
  };

  // The profile: the person in full (the CV's nodes), the site, FOAF.
  const profile = id =>
    ld.mergeNodes([
      ld.websiteNode(),
      ...ld.cvNodes(cvData),
      ...foafNodes(),
      profileDocument(id),
    ]);

  const vocab = ld.vocabularyNodes();
  const provenance = provenanceNodes();

  const everything = [
    ...ld.homeGraph(),
    ...ld.timelineGraph(allPosts),
    ...allPosts.flatMap(post => ld.postGraph(post)),
    ...ld.projectsGraph(),
    ...ld.cvGraph(cvData),
    ...ld.consultingGraph(),
    ...ld.vocabGraph(),
    ...foafNodes(),
    ...(provenance || []),
  ];

  const me = serialise(profile(LD.profileTurtle));
  const vocabulary = serialise(vocab);
  const prov = provenance ? serialise(provenance) : null;
  const graphWithoutDataset = serialise(ld.mergeNodes(everything));

  const subsets = [
    {
      id: `${SITE}/#profile`,
      title: 'profile',
      dumps: [LD.profileTurtle, LD.profileJsonLd],
      triples: me.triples.length,
    },
    {
      id: `${SITE}/#vocabulary`,
      title: 'vocabulary',
      dumps: [LD.vocabTurtle, LD.vocabJsonLd],
      triples: vocabulary.triples.length,
    },
    ...(prov
      ? [
          {
            id: `${SITE}/#provenance`,
            title: 'provenance',
            dumps: [LD.provenanceTurtle, LD.provenanceJsonLd],
            triples: prov.triples.length,
          },
        ]
      : []),
  ];
  const dataset = datasetNode(graphWithoutDataset.size, subsets);
  const graph = serialise(ld.mergeNodes([...everything, dataset]));
  const voidDescription = serialise([dataset]);

  const write = (file, content) => {
    const target = path.join(OUT, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
    return target;
  };
  const json = nodes =>
    JSON.stringify(ld.jsonLdDocument(nodes), null, 2) + '\n';

  const written = [
    write('me.ttl', me.turtle),
    write('me.jsonld', json(profile(LD.profileJsonLd))),
    write('vocab.ttl', vocabulary.turtle),
    write('vocab.jsonld', json(vocabulary.nodes)),
    write('graph.ttl', graph.turtle),
    write('graph.jsonld', json(graph.nodes)),
    write('void.ttl', voidDescription.turtle),
    // VoID's discovery convention: the description at a well-known address.
    write(path.join('.well-known', 'void'), voidDescription.turtle),
  ];
  if (prov) {
    written.push(write('provenance.ttl', prov.turtle));
    written.push(write('provenance.jsonld', json(prov.nodes)));
  } else {
    console.warn(
      `linked-data: no model manifest at ${path.relative(process.cwd(), MODEL_MANIFEST)}; provenance.* not written.`
    );
  }

  console.log(
    `linked-data: ${graph.size.triples} triples over ${graph.size.entities} resources ` +
      `(profile ${me.triples.length}, vocabulary ${vocabulary.triples.length}` +
      `${prov ? `, provenance ${prov.triples.length}` : ''}) → ` +
      `${written.length} files in ${path.relative(process.cwd(), OUT) || '.'}`
  );
}

main();
