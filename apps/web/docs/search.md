# Site search

One search box over the whole site, opened with **⌘K** (**Ctrl+K** off a Mac)
or **/**, from any page, or from the magnifier that closes the capsule of page
links — on a phone and on a desktop alike. It finds pages, posts, projects,
apps, experiments and CV roles, and a result goes straight to its page, or for
a project or an app, to its card.

It is the site's only search. The timeline and the CV used to carry a box of
their own behind a second magnifier; a list page's control row is now what is
shown (its pickers) and what can be taken away (a feed, a download), and
nothing to type into.

## How it works

- **The index is built ahead of time.** `npm run build:search`
  (`scripts/build-search-index.mjs`) writes `static/search-index.json`: one
  document per page, post, project, app and CV role, each with its title, its
  address, a one-line summary and the text it is searched by. The shaping is in
  `scripts/lib/search-docs.js`, which is pure and tested; a post's body is
  capped at 4,000 characters. The file is build output, gitignored, and
  `build`, `develop` and `start` all run the script.
- **The browser fetches it the first time the search opens**, about 25KB
  gzipped, and keeps it for the visit. A failed fetch is tried again the next
  time the search opens.
- **Ranking is the chat's own BM25 and tokenizer** (`src/lib/chat/retrieval.mjs`),
  with two additions for someone typing (`src/lib/search.ts`):
  - the word still being typed matches every indexed term it begins, so `fug`
    is already fugue;
  - a document whose title carries every typed word goes to the top, and the
    shorter the title, the higher, so `fugue` puts fugue above fugue-evo and
    `fugue evo` puts fugue-evo first.
- **No embeddings.** The chat's semantic index needs a model in the browser;
  the search answers per keystroke and can't wait for one.

An empty search lists the pages, as a way to go somewhere.

## Where things live

| What                       | Where                                                                             |
| -------------------------- | --------------------------------------------------------------------------------- |
| The palette and its button | `src/components/search/SearchPalette.tsx`, `src/styles/search.scss`               |
| Where the button sits      | the nav in `src/components/layout.tsx`, `.nav-search` in `src/styles/layout.scss` |
| Ranking and loading        | `src/lib/search.ts`                                                               |
| The documents              | `scripts/lib/search-docs.js`, `scripts/lib/search-corpus.mjs`                     |
| A project's card anchor    | `projectAnchor` in `src/components/projects/ProjectCard.tsx`                      |

A project's card carries the same `#project-<name>` fragment its linked-data
URI uses, so `/projects/#project-fugue` lands on the card from a search result
and from the graph alike.

## Adding something to it

A new post, project or role is in the index on the next build; nothing to
register. A new page needs an entry in `pageDocs` in
`scripts/lib/search-docs.js`.
