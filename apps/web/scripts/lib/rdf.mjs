/**
 * JSON-LD nodes → RDF triples → Turtle.
 *
 * Not a general JSON-LD processor: the nodes it reads are the ones
 * src/config/linked-data.ts builds, whose shape is known — schema.org terms
 * unprefixed, everything else prefixed, references as `{ '@id' }` objects
 * except under the handful of schema.org properties whose context types them
 * as IRIs. Within that shape the conversion is exact, needs no network to
 * fetch a context, and yields the same bytes on every run, which is what the
 * build wants from a file it regenerates.
 *
 * Nested objects without an `@id` become blank nodes, written inline as
 * `[ ... ]` when nothing else refers to them (nothing does).
 */

// schema.org's own JSON-LD context maps its terms to http://schema.org/, so a
// consumer expanding the pages' JSON-LD and one reading these Turtle files
// see the same IRIs. (schema.org treats the http and https forms as the same
// vocabulary; this is the spelling the context uses.)
export const PREFIXES = {
  schema: 'http://schema.org/',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  owl: 'http://www.w3.org/2002/07/owl#',
  skos: 'http://www.w3.org/2004/02/skos/core#',
  foaf: 'http://xmlns.com/foaf/0.1/',
  dcterms: 'http://purl.org/dc/terms/',
  prov: 'http://www.w3.org/ns/prov#',
  void: 'http://rdfs.org/ns/void#',
};

const RDF_TYPE = `${PREFIXES.rdf}type`;

/**
 * `skos:prefLabel` → its IRI; a bare term → schema.org's.
 * @param {string} term
 * @param {Record<string, string>} [prefixes]
 */
export function expandTerm(term, prefixes = PREFIXES) {
  if (/^https?:\/\//.test(term)) return term;
  const colon = term.indexOf(':');
  if (colon > 0) {
    const prefix = term.slice(0, colon);
    if (prefixes[prefix]) return prefixes[prefix] + term.slice(colon + 1);
  }
  return prefixes.schema + term;
}

/**
 * @typedef {{ iri: string } | { bnode: string } | { literal: string, lang?: string, datatype?: string }} Term
 * @typedef {{ s: string, p: string, o: Term }} Triple
 * @typedef {Record<string, unknown>} Node
 */

/**
 * The triples a list of nodes states. Each triple is `{ s, p, o }`: `s` an
 * IRI or a blank-node label, `p` an IRI, `o` one of
 * `{ iri }`, `{ bnode }` or `{ literal, lang?, datatype? }`.
 *
 * `iriProperties` are the schema.org terms whose string values are IRIs.
 *
 * @param {Node[]} nodes
 * @param {{ iriProperties?: string[], prefixes?: Record<string, string> }} [options]
 * @returns {Triple[]}
 */
export function toTriples(
  nodes,
  { iriProperties = [], prefixes = PREFIXES } = {}
) {
  const iriTerms = new Set(iriProperties.map(p => expandTerm(p, prefixes)));
  const triples = [];
  const seen = new Set();
  let blank = 0;

  const add = (s, p, o) => {
    const key = JSON.stringify([s, p, o]);
    if (seen.has(key)) return;
    seen.add(key);
    triples.push({ s, p, o });
  };

  const value = (subject, predicate, v) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) {
      v.forEach(item => value(subject, predicate, item));
      return;
    }
    if (typeof v === 'string') {
      add(
        subject,
        predicate,
        iriTerms.has(predicate) ? { iri: v } : { literal: v }
      );
      return;
    }
    if (typeof v === 'number') {
      add(subject, predicate, {
        literal: String(v),
        datatype: `${prefixes.xsd}${Number.isInteger(v) ? 'integer' : 'decimal'}`,
      });
      return;
    }
    if (typeof v === 'boolean') {
      add(subject, predicate, {
        literal: String(v),
        datatype: `${prefixes.xsd}boolean`,
      });
      return;
    }
    if (typeof v === 'object') {
      if ('@value' in v) {
        const literal = { literal: String(v['@value']) };
        if (v['@language']) literal.lang = v['@language'];
        else if (v['@type'])
          literal.datatype = expandTerm(v['@type'], prefixes);
        add(subject, predicate, literal);
        return;
      }
      if (v['@id']) {
        add(subject, predicate, { iri: v['@id'] });
        if (Object.keys(v).length > 1) node(v);
        return;
      }
      const label = `_:b${++blank}`;
      add(subject, predicate, { bnode: label });
      node(v, label);
    }
  };

  const node = (n, subject = n['@id']) => {
    if (!subject)
      throw new Error('a node with no @id needs a blank-node label');
    for (const [key, v] of Object.entries(n)) {
      if (key === '@id' || v === undefined) continue;
      if (key === '@type') {
        []
          .concat(v)
          .forEach(type =>
            add(subject, RDF_TYPE, { iri: expandTerm(type, prefixes) })
          );
        continue;
      }
      value(subject, expandTerm(key, prefixes), v);
    }
  };

  nodes.forEach(n => node(n));
  return triples;
}

// --- Turtle ---------------------------------------------------------------

const PN_LOCAL = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/**
 * `<iri>`, or a prefixed name when one of the prefixes covers it cleanly.
 * @param {string} iri
 * @param {Record<string, string>} [prefixes]
 */
export function compactIri(iri, prefixes = PREFIXES) {
  if (iri === RDF_TYPE) return 'a';
  for (const [prefix, ns] of Object.entries(prefixes)) {
    if (iri.startsWith(ns)) {
      const local = iri.slice(ns.length);
      if (PN_LOCAL.test(local)) return `${prefix}:${local}`;
    }
  }
  return `<${iri}>`;
}

const escapeLiteral = s =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');

const XSD_BARE = new Set(['integer', 'decimal', 'boolean']);

// `name` compacts an IRI and records the prefix it used, so the header
// declares every prefix the body relies on — the datatypes included.
function term(o, name, inline, indent) {
  if (o.iri !== undefined) return name(o.iri);
  if (o.bnode !== undefined) return inline(o.bnode, indent);
  if (o.datatype) {
    const local = o.datatype.slice(PREFIXES.xsd.length);
    if (o.datatype.startsWith(PREFIXES.xsd) && XSD_BARE.has(local))
      return o.literal;
    return `"${escapeLiteral(o.literal)}"^^${name(o.datatype)}`;
  }
  if (o.lang) return `"${escapeLiteral(o.literal)}"@${o.lang}`;
  return `"${escapeLiteral(o.literal)}"`;
}

/**
 * Triples as Turtle: one block per subject, `a` first, the rest in the order
 * they were stated; blank nodes inline. Only prefixes that are actually
 * used are declared, and in a fixed order, so the file is stable.
 */
/**
 * @param {Triple[]} triples
 * @param {{ prefixes?: Record<string, string>, base?: string }} [options]
 * @returns {string}
 */
export function toTurtle(triples, { prefixes = PREFIXES, base } = {}) {
  const bySubject = new Map();
  const bnodeRefs = new Map();
  for (const t of triples) {
    if (!bySubject.has(t.s)) bySubject.set(t.s, []);
    bySubject.get(t.s).push(t);
    if (t.o.bnode !== undefined)
      bnodeRefs.set(t.o.bnode, (bnodeRefs.get(t.o.bnode) || 0) + 1);
  }

  const used = new Set();
  const name = iri => {
    const compact = compactIri(iri, prefixes);
    const colon = compact.indexOf(':');
    if (!compact.startsWith('<') && colon > 0)
      used.add(compact.slice(0, colon));
    if (compact === 'a') used.add('rdf');
    return compact;
  };

  // A blank node referred to exactly once is written where it is used,
  // nested one level deeper than the predicate that carries it.
  const inline = (label, indent) => {
    if (bnodeRefs.get(label) !== 1) return label;
    const inner = `${indent}  `;
    return `[\n${inner}${predicates(label, inner)}\n${indent}]`;
  };

  const predicates = (subject, indent) => {
    const rows = bySubject.get(subject) || [];
    const ordered = [
      ...rows.filter(t => t.p === RDF_TYPE),
      ...rows.filter(t => t.p !== RDF_TYPE),
    ];
    const grouped = new Map();
    for (const t of ordered) {
      if (!grouped.has(t.p)) grouped.set(t.p, []);
      grouped.get(t.p).push(term(t.o, name, inline, indent));
    }
    return Array.from(grouped.entries())
      .map(([p, objects]) => `${name(p)} ${objects.join(', ')}`)
      .join(` ;\n${indent}`);
  };

  const blocks = [];
  for (const subject of bySubject.keys()) {
    if (subject.startsWith('_:') && bnodeRefs.get(subject) === 1) continue;
    const body = predicates(subject, '  ');
    const head = subject.startsWith('_:') ? subject : name(subject);
    blocks.push(`${head}\n  ${body} .`);
  }

  const header = [];
  if (base) header.push(`@base <${base}> .`);
  for (const prefix of Object.keys(prefixes)) {
    if (used.has(prefix))
      header.push(`@prefix ${prefix}: <${prefixes[prefix]}> .`);
  }
  return `${header.join('\n')}\n\n${blocks.join('\n\n')}\n`;
}

/**
 * The counts VoID asks for: triples, and distinct non-blank subjects.
 * @param {Triple[]} triples
 */
export function summarize(triples) {
  const entities = new Set(
    triples.map(t => t.s).filter(s => !s.startsWith('_:'))
  );
  return { triples: triples.length, entities: entities.size };
}
