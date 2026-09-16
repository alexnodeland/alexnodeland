# 🕸️ Linked Data

The site describes itself to machines in the vocabularies the W3C and
schema.org define, on every page and as files beside them. This page says
what is there, where it comes from, and how to add to it.

## 📋 Table of Contents

- [What a page carries](#what-a-page-carries)
- [The graph](#the-graph)
- [Identifiers](#identifiers)
- [The files](#the-files)
- [The vocabulary](#the-vocabulary)
- [Adding to it](#adding-to-it)
- [Checking it](#checking-it)
- [Related Files](#related-files)

## What a page carries

Every page's `<head>` says, through `src/components/seo.tsx`:

| Layer               | What                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| JSON-LD             | The page's nodes as one `@graph` (schema.org, plus SKOS on `/vocab/`).                                            |
| Open Graph, Twitter | Title, description, card, `og:type` (`website`, `profile`, `article`), `article:published_time` on posts.         |
| Dublin Core         | `DC.title`, `DC.creator`, `DC.identifier`, `DC.language`, `DC.type`, `DC.rights`, `DCTERMS.issued`, `DC.subject`. |
| Links               | `rel="canonical"`, `rel="author"` → `/`, and `rel="alternate"` to the Turtle and JSON-LD where a page has them.   |

And, once for the whole site, through `gatsby-ssr.tsx`:

| Layer      | What                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| `lang`     | `<html lang="en">`. (The feed's autodiscovery link is gatsby-plugin-feed's, in every head already.)  |
| `rel="me"` | The GitHub and LinkedIn profiles and the email, claimed from the head and again on the footer links. |
| FOAF       | `<link rel="meta" type="text/turtle" href="/me.ttl">`, the FOAF autodiscovery convention.            |
| VoID       | `<link rel="describedby" type="text/turtle" href="/void.ttl">`.                                      |

In the body, microformats2 sits on the HTML the pages already render:

- the footer is the site's representative `h-card` (`p-name`, `u-email`,
  `u-url` with `rel="me"`, `u-uid` = the site);
- the timeline is an `h-feed` of `h-entry` cards (`p-name`, `u-url`,
  `p-summary`, `dt-published`, `p-category`);
- a post page is one `h-entry` (`p-name`, `dt-published`, `p-category`,
  `p-summary`, `e-content`, `u-url u-uid`), whose author is found through
  the `rel="author"` link in the head.

There is no RDFa or microdata. The JSON-LD is the one place the graph is
written; a second inline serialisation would be a second thing to keep in
step with it.

## The graph

`src/config/linked-data.ts` builds every node, from the same config the
visible pages render (`site.ts`, `cv.ts`, `projects.ts`, `homepage.ts`) and
from the posts' frontmatter. The pages embed the nodes as JSON-LD; the build
script serialises the same nodes as files. Neither can drift from the other
or from the page a person reads.

| Page           | Nodes                                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `/`            | `WebSite`, `Person` (in brief), `ProfilePage`.                                                                                    |
| `/timeline/`   | `Blog` with every `BlogPosting` (headline, date, tag as a concept), `CollectionPage`.                                             |
| a post         | `BlogPosting` in full (its PDF as `encoding`), `WebPage`, `BreadcrumbList`.                                                       |
| `/projects/`   | `ItemList` of `SoftwareSourceCode` (repository, language, tags, stars, category as a concept), `CollectionPage`.                  |
| `/cv/`         | `Person` in full: `OrganizationRole`s on `worksFor`, `EducationalOccupationalCredential`s, `alumniOf`, the CV PDF, `ProfilePage`. |
| `/consulting/` | `Service` with a `ScheduleAction`, and the steps as a `HowTo`.                                                                    |
| `/vocab/`      | The SKOS `ConceptScheme`, its `Collection`s and every `Concept`.                                                                  |

Every page also carries a `BreadcrumbList` and a `WebPage` node that is
`isPartOf` the `WebSite`.

## Identifiers

Every thing the graph names has one URI, a fragment on the page that
describes it, so the URI dereferences to a page carrying its own
description:

| Thing           | URI                                                 |
| --------------- | --------------------------------------------------- |
| the person      | `https://alexnodeland.com/#me`                      |
| the site        | `https://alexnodeland.com/#website`                 |
| the blog        | `https://alexnodeland.com/timeline/#blog`           |
| a post          | `https://alexnodeland.com/timeline/<slug>/#post`    |
| a project       | `https://alexnodeland.com/projects/#project-<name>` |
| a role          | `https://alexnodeland.com/cv/#role-<n>`             |
| an organization | `https://alexnodeland.com/#org-<name>`              |
| a concept       | `https://alexnodeland.com/vocab/#<id>`              |
| the dataset     | `https://alexnodeland.com/#dataset`                 |

`/#me` doubles as a WebID: the front page carries its JSON-LD, and
`/me.ttl` is the Turtle a WebID consumer wants, linked from the head as an
alternate and declared as the `foaf:PersonalProfileDocument` about it.

## The files

`npm run build:ld` (`scripts/build-linked-data.mjs`) writes these into
`static/`, from where Gatsby ships them. They run before every build and
`develop`, like the CV PDFs, and are ignored by git.

| File                             | What                                                                       |
| -------------------------------- | -------------------------------------------------------------------------- |
| `/me.ttl`, `/me.jsonld`          | The profile: the person in full (schema.org + FOAF), the site.             |
| `/vocab.ttl`, `/vocab.jsonld`    | The SKOS concept scheme.                                                   |
| `/graph.ttl`, `/graph.jsonld`    | Everything, merged: person, site, every post, project, role, concept.      |
| `/provenance.ttl`, `.jsonld`     | PROV-O: content snapshot → corpus → training run → the site model.         |
| `/void.ttl`, `/.well-known/void` | VoID: what the dataset is, its vocabularies, dumps, subsets, triple count. |

The Turtle and the JSON-LD of each pair are the same graph: the JSON-LD
context types the URL-valued schema.org properties as `@id` so a JSON-LD
processor and a Turtle parser produce identical triples (checked with
rdflib's isomorphism test during development). The pages' own JSON-LD keeps
those properties as plain strings, which is what search engines expect.

`scripts/lib/rdf.mjs` is the serialiser: JSON-LD nodes of the shape the
builders produce → triples → Turtle. It is not a general JSON-LD processor
and needs no network; within the shape it reads, the conversion is exact.

The provenance graph reads `apps/model/models/site-needle.json`. A checkout
without it builds everything else and says so.

## The vocabulary

The site sorts things by a handful of categories that used to live as
strings in three config files: the projects page's sections, the timeline's
tags, and the audiences a CV bullet is written for. `VOCABULARY` in
`linked-data.ts` is those strings as SKOS concepts — a URI, a `prefLabel`,
a `definition`, `altLabel`s and `related` links — in three `skos:Collection`s.
`/vocab/` is the page a concept URI lands on; each entry's heading carries
the concept's id.

A category used anywhere in the config needs a concept:

- the config test fails on a project category or audience tag without one;
- the build warns on a post category without one, and the post carries the
  keyword but no `about`.

## Adding to it

- **A new page.** Add a `*Graph()` builder in `linked-data.ts` (a page node
  via `webPageNode`, a breadcrumb, the page's own nodes) and pass it to the
  page's `<SEO jsonLd={…} />`. Add it to `everything` in the build script.
- **A new category.** Add the concept to `VOCABULARY.concepts` and to the
  collection it belongs in. Relations are symmetric: say `related` on both
  sides.
- **A new vocabulary.** Add its prefix to `LD_PREFIXES` (the pages) and
  `PREFIXES` in `rdf.mjs` (the Turtle). Write its terms prefixed
  (`prov:used`), references as `{ '@id': … }`.
- **A new URL-valued schema.org property.** Add it to
  `SCHEMA_IRI_PROPERTIES`, or write its value as `{ '@id': … }`.

## Checking it

```bash
npm test -- linked-data rdf head vocab SEO   # the graph, the serialiser, the head, the page
npm run build:ld                              # writes the files; warns on an orphaned category
```

Then any of: Google's Rich Results test on a page; the W3C's microformats
parser (`pin13.net/mf2`) on `/` and a post; `rapper -i turtle static/graph.ttl`
or rdflib for the Turtle; a JSON-LD playground on a `.jsonld`.

## Related Files

- `src/config/linked-data.ts` — the nodes, the URIs, the vocabulary
- `src/components/seo.tsx` — the head, per page
- `gatsby-ssr.tsx` — the head, once for the site
- `src/pages/vocab.tsx` — the vocabulary, for people
- `scripts/build-linked-data.mjs`, `scripts/lib/rdf.mjs` — the files
- `src/components/layout.tsx`, `src/pages/timeline.tsx`,
  `src/templates/timeline-post.tsx` — the microformats
