# Role profiles

What postings for a family of roles ask for, as a corpus the CV scores are
measured against. `npm run score:cv` reads every family in here.

Each subdirectory is one family, named for the CV variant it belongs to: a
variant with a directory of the same name is scored against that family alone
(`fde` against `fde/`), and a document with no family of its own is scored
against all of them. Adding a family for a new variant is adding a directory.

## What a profile is

One posting, paraphrased and anonymised, as a Markdown file:

```markdown
---
id: fde-01
family: fde
title: Forward Deployed Engineer
seniority: senior
years_experience: '5+'
employer_type: ai-lab
work_mode: hybrid
travel: 'up to 50%'
retrieved: 2026-09-16
---

## About the role

## Responsibilities

## Required qualifications

## Preferred qualifications
```

The sections hold bullets. An empty section says `- None listed separately.`
and is skipped. The bullets under the last three sections are what both
scores read. The paragraph under "About the role" is context for a reader and
is not scored: a posting that describes its employer as a startup is not asking
for startup experience, and a resume is not credited for the word.

## What is not in a profile

No names of the employer, its products or its customers, no place names, no
salary or equity figures, no boilerplate about benefits or equal opportunity,
and no passage long enough to search for. Third-party tools and platforms are
kept exactly as the posting wrote them, since matching them is the point. The
employer is described by type (`employer_type`) and the role by what it does.

Where a posting is from is deliberately not recorded here. The records are the
signal; the sources were the means.

## The lexicon

`lexicon.json` lists the terms the keyword score looks for, each with the
spellings a posting or a resume might use for it. A term's weight in a family
is how many of its profiles ask for it, so a term no profile names costs a
resume nothing to leave off, and adding a term to the lexicon changes a score
only if the profiles ask for it. Keep entries to skills, tools and ways of
working; common English inflates every score equally and separates nothing.

## Keeping it useful

- Around fifteen profiles per family. Fewer and a single posting's vocabulary
  becomes "what the field asks for"; the counts are the signal.
- Postings from the employers' own listings, not aggregators, and recent: the
  vocabulary of these roles moves within a year.
- Paraphrase, then check for shared runs of a dozen words or more against
  the source, and reword them.
- A refreshed corpus moves the scores. Re-record the baseline in the same
  change (`npm run score:cv -- --update-baseline`) and say so.
