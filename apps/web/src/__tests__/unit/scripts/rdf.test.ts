/**
 * The JSON-LD → Turtle serialiser behind `npm run build:ld`, on small graphs
 * whose Turtle can be read by eye. The site's own nodes are exercised at the
 * end, whole, for the properties a parser would choke on: every prefix used
 * is declared, every literal is escaped, every reference is an IRI.
 */
import {
  compactIri,
  expandTerm,
  summarize,
  toTriples,
  toTurtle,
} from '../../../../scripts/lib/rdf.mjs';
import {
  cvGraph,
  homeGraph,
  SCHEMA_IRI_PROPERTIES,
  vocabularyNodes,
} from '../../../config/linked-data';

const options = { iriProperties: SCHEMA_IRI_PROPERTIES };

describe('terms', () => {
  it('expands a bare term to schema.org and a prefixed one to its namespace', () => {
    expect(expandTerm('name')).toBe('http://schema.org/name');
    expect(expandTerm('skos:prefLabel')).toBe(
      'http://www.w3.org/2004/02/skos/core#prefLabel'
    );
    expect(expandTerm('https://example.org/p')).toBe('https://example.org/p');
    // An unknown prefix is not a prefix: "mailto:x" is a schema.org term? No —
    // it is left to be an IRI by the caller; here it is treated as a term.
    expect(expandTerm('x:y')).toBe('http://schema.org/x:y');
  });

  it('compacts an IRI to a prefixed name only when the local part is clean', () => {
    expect(compactIri('http://schema.org/Person')).toBe('schema:Person');
    expect(compactIri('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')).toBe(
      'a'
    );
    expect(compactIri('http://schema.org/')).toBe('<http://schema.org/>');
    expect(compactIri('https://alexnodeland.com/#me')).toBe(
      '<https://alexnodeland.com/#me>'
    );
  });
});

describe('triples', () => {
  it('reads types, literals, references and IRI-valued properties', () => {
    const triples = toTriples(
      [
        {
          '@id': 'https://x.test/#a',
          '@type': ['Person', 'foaf:Person'],
          name: 'A',
          url: 'https://x.test/',
          knows: { '@id': 'https://x.test/#b' },
          age: 3,
          alive: true,
          'skos:prefLabel': { '@value': 'a', '@language': 'en' },
          when: { '@value': '2020-01-01T00:00:00Z', '@type': 'xsd:dateTime' },
        },
      ],
      options
    );
    expect(triples).toEqual([
      {
        s: 'https://x.test/#a',
        p: expandTerm('rdf:type'),
        o: { iri: 'http://schema.org/Person' },
      },
      {
        s: 'https://x.test/#a',
        p: expandTerm('rdf:type'),
        o: { iri: 'http://xmlns.com/foaf/0.1/Person' },
      },
      {
        s: 'https://x.test/#a',
        p: 'http://schema.org/name',
        o: { literal: 'A' },
      },
      {
        s: 'https://x.test/#a',
        p: 'http://schema.org/url',
        o: { iri: 'https://x.test/' },
      },
      {
        s: 'https://x.test/#a',
        p: 'http://schema.org/knows',
        o: { iri: 'https://x.test/#b' },
      },
      {
        s: 'https://x.test/#a',
        p: 'http://schema.org/age',
        o: {
          literal: '3',
          datatype: 'http://www.w3.org/2001/XMLSchema#integer',
        },
      },
      {
        s: 'https://x.test/#a',
        p: 'http://schema.org/alive',
        o: {
          literal: 'true',
          datatype: 'http://www.w3.org/2001/XMLSchema#boolean',
        },
      },
      {
        s: 'https://x.test/#a',
        p: 'http://www.w3.org/2004/02/skos/core#prefLabel',
        o: { literal: 'a', lang: 'en' },
      },
      {
        s: 'https://x.test/#a',
        p: 'http://schema.org/when',
        o: {
          literal: '2020-01-01T00:00:00Z',
          datatype: 'http://www.w3.org/2001/XMLSchema#dateTime',
        },
      },
    ]);
  });

  it('gives a nested object without an id a blank node, and a nested one with an id its own triples', () => {
    const triples = toTriples(
      [
        {
          '@id': 'https://x.test/#a',
          address: { '@type': 'PostalAddress', addressRegion: 'NY' },
          worksFor: {
            '@id': 'https://x.test/#org',
            '@type': 'Organization',
            name: 'O',
          },
        },
      ],
      options
    );
    expect(triples).toEqual([
      {
        s: 'https://x.test/#a',
        p: 'http://schema.org/address',
        o: { bnode: '_:b1' },
      },
      {
        s: '_:b1',
        p: expandTerm('rdf:type'),
        o: { iri: 'http://schema.org/PostalAddress' },
      },
      {
        s: '_:b1',
        p: 'http://schema.org/addressRegion',
        o: { literal: 'NY' },
      },
      {
        s: 'https://x.test/#a',
        p: 'http://schema.org/worksFor',
        o: { iri: 'https://x.test/#org' },
      },
      {
        s: 'https://x.test/#org',
        p: expandTerm('rdf:type'),
        o: { iri: 'http://schema.org/Organization' },
      },
      {
        s: 'https://x.test/#org',
        p: 'http://schema.org/name',
        o: { literal: 'O' },
      },
    ]);
  });

  it('states a triple once however many nodes repeat it', () => {
    const triples = toTriples(
      [
        { '@id': 'https://x.test/#a', name: 'A' },
        { '@id': 'https://x.test/#a', name: 'A', url: 'https://x.test/' },
      ],
      options
    );
    expect(triples).toHaveLength(2);
    expect(summarize(triples)).toEqual({ triples: 2, entities: 1 });
  });
});

describe('turtle', () => {
  it('writes one block per subject, the type first, blank nodes inline', () => {
    const turtle = toTurtle(
      toTriples(
        [
          {
            '@id': 'https://x.test/#a',
            name: 'A "quoted"\nname',
            '@type': 'Person',
            'skos:prefLabel': { '@value': 'a', '@language': 'en' },
            address: { '@type': 'PostalAddress', addressRegion: 'NY' },
            sameAs: ['https://x.test/1', 'https://x.test/2'],
            age: 3,
          },
        ],
        options
      )
    );
    expect(turtle).toBe(
      [
        '@prefix schema: <http://schema.org/> .',
        '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .',
        '@prefix skos: <http://www.w3.org/2004/02/skos/core#> .',
        '',
        '<https://x.test/#a>',
        '  a schema:Person ;',
        '  schema:name "A \\"quoted\\"\\nname" ;',
        '  skos:prefLabel "a"@en ;',
        '  schema:address [',
        '    a schema:PostalAddress ;',
        '    schema:addressRegion "NY"',
        '  ] ;',
        '  schema:sameAs <https://x.test/1>, <https://x.test/2> ;',
        '  schema:age 3 .',
        '',
      ].join('\n')
    );
  });

  it('declares the prefix a typed literal uses', () => {
    const turtle = toTurtle(
      toTriples(
        [
          {
            '@id': 'https://x.test/#a',
            'prov:endedAtTime': {
              '@value': '2020-01-01T00:00:00Z',
              '@type': 'xsd:dateTime',
            },
          },
        ],
        options
      )
    );
    expect(turtle).toContain(
      '@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .'
    );
    expect(turtle).toContain('@prefix prov: <http://www.w3.org/ns/prov#> .');
    expect(turtle).toContain('"2020-01-01T00:00:00Z"^^xsd:dateTime');
  });

  it('serialises the site itself with every prefix declared and no dangling blank node', () => {
    const nodes = [...homeGraph(), ...cvGraph(), ...vocabularyNodes()];
    const turtle = toTurtle(toTriples(nodes, options));
    const declared = new Set(
      Array.from(turtle.matchAll(/^@prefix (\w+):/gm)).map(m => m[1])
    );
    const used = new Set(
      Array.from(turtle.matchAll(/(?:^|[\s,[])(\w+):[A-Za-z_]/gm)).map(
        m => m[1]
      )
    );
    for (const prefix of Array.from(used)) {
      expect(declared.has(prefix)).toBe(true);
    }
    expect(turtle).not.toMatch(/_:b\d+/);
    // The person appears as one subject, with the front page's and the CV's
    // claims about it merged by the triple store rather than repeated.
    expect(turtle.match(/^<https:\/\/alexnodeland\.com\/#me>$/gm)).toHaveLength(
      1
    );
  });
});
