import { Link } from 'gatsby';
import React from 'react';
import SEO from '../components/seo';
import {
  Concept,
  LD,
  VOCABULARY,
  conceptFor,
  vocabGraph,
} from '../config/linked-data';
import '../styles/index.scss';
import '../styles/vocab.scss';

/**
 * The site's vocabulary, for people.
 *
 * Every concept the site sorts things by — the projects page's sections, the
 * timeline's tags, the audiences a CV line is written for — has a URI on this
 * page: `/vocab/#ai` is the concept "ai". A machine that dereferences it gets
 * this page and the SKOS graph in its head; a person gets the same list,
 * read. The Turtle and JSON-LD alternates in the head are the same graph as
 * files (see scripts/build-linked-data.mjs).
 *
 * Each heading carries the concept's id, so the fragment in the URI lands on
 * the entry that defines it — which is what makes the URI dereferenceable
 * rather than merely unique.
 */
const VocabPage: React.FC<{ location?: { pathname?: string } }> = ({
  location,
}) => {
  const byId = new Map(VOCABULARY.concepts.map(c => [c.id, c]));

  const conceptCard = (concept: Concept) => (
    <article key={concept.id} className="vocab-concept" id={concept.id}>
      <div className="vocab-concept-body">
        <div className="vocab-concept-header">
          <h3 className="vocab-concept-label">{concept.prefLabel}</h3>
          <code className="vocab-concept-notation">{concept.id}</code>
        </div>
        <p className="vocab-concept-definition">{concept.definition}</p>
      </div>
      {(concept.altLabels?.length || concept.related?.length) && (
        <div className="vocab-concept-meta">
          {concept.altLabels && concept.altLabels.length > 0 && (
            <p className="vocab-concept-line">
              <span className="vocab-concept-key">also:</span>{' '}
              {concept.altLabels.join(' • ')}
            </p>
          )}
          {concept.related && concept.related.length > 0 && (
            <p className="vocab-concept-line">
              <span className="vocab-concept-key">related:</span>{' '}
              {concept.related.map((id, index) => (
                <React.Fragment key={id}>
                  {index > 0 && ' • '}
                  <a href={`#${id}`}>{byId.get(id)?.prefLabel ?? id}</a>
                </React.Fragment>
              ))}
            </p>
          )}
        </div>
      )}
    </article>
  );

  return (
    <>
      <SEO
        title={VOCABULARY.title}
        description={VOCABULARY.description}
        pathname={location?.pathname}
        jsonLd={vocabGraph()}
        alternates={[
          { href: LD.vocabTurtle, type: 'text/turtle', title: 'vocabulary' },
          {
            href: LD.vocabJsonLd,
            type: 'application/ld+json',
            title: 'vocabulary',
          },
        ]}
      />
      <div className="home vocab-page">
        <section className="about">
          <div className="about-content">
            <p>{VOCABULARY.description}</p>
            <p className="about-consulting-note">
              a <a href="https://www.w3.org/TR/skos-reference/">skos</a> concept
              scheme. each entry below is a concept with a uri: this page&apos;s
              address plus the fragment beside its name. the same scheme is
              served as{' '}
              <a href={LD.vocabTurtle} type="text/turtle">
                turtle
              </a>{' '}
              and{' '}
              <a href={LD.vocabJsonLd} type="application/ld+json">
                json-ld
              </a>
              , and the whole site as a graph is described at{' '}
              <a href={LD.void} type="text/turtle">
                void.ttl
              </a>
              .
            </p>
          </div>
        </section>

        {VOCABULARY.collections.map(collection => (
          <section
            key={collection.id}
            className="vocab-section"
            id={`${collection.id}-collection`}
            aria-labelledby={`${collection.id}-title`}
          >
            <h2 id={`${collection.id}-title`}>{collection.label}</h2>
            <p className="vocab-section-description">
              {collection.description}
            </p>
            <div className="vocab-concepts">
              {collection.members
                .map(id => conceptFor(id))
                .filter((c): c is Concept => Boolean(c))
                // A concept in two collections is defined once, under the
                // first collection that lists it; the second just points.
                .map(concept =>
                  VOCABULARY.collections.find(c =>
                    c.members.includes(concept.id)
                  ) === collection ? (
                    conceptCard(concept)
                  ) : (
                    <p key={concept.id} className="vocab-concept-pointer">
                      <a href={`#${concept.id}`}>{concept.prefLabel}</a>{' '}
                      <span className="vocab-concept-key">(defined above)</span>
                    </p>
                  )
                )}
            </div>
          </section>
        ))}

        <section className="vocab-section vocab-uses">
          <h2>where it is used</h2>
          <p className="vocab-section-description">
            the <Link to="/projects">projects</Link> are each about one of the
            project categories, every <Link to="/timeline">timeline</Link> post
            carries one of the post categories, and each{' '}
            <Link to="/cv">cv</Link> role page selects its lines by an audience.
          </p>
        </section>
      </div>
    </>
  );
};

export default VocabPage;
