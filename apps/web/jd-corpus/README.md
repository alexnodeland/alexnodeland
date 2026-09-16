# Job description corpus

Drop real postings in here as `.md` or `.txt`, one per file — the ones you are
actually applying to. `npm run report:cv` reads every file in this directory and
reports which terms come up across the set and appear nowhere in a given
variant.

A few things that make the report worth reading:

- **Twenty to thirty postings.** The signal is how _many separate postings_ ask
  for something. Below about eight files the counts are noise, and a term that
  appears in one posting is that company's vocabulary rather than the field's.
- **Split FDE and AI Engineer postings** if you want the two variants judged
  against their own market — keep them in separate directories and point the
  script at one at a time.
- **Paste the requirements, not the boilerplate.** The benefits section and the
  equal-opportunity paragraph are a third of a typical posting and contribute
  nothing but common English.

The output is a list of things to check, never a list to paste. A term belongs
on the resume only if it is true of work already described there — and if it is
true and missing, the fix is usually to reword a bullet that already covers it,
not to append a keyword.

This README is skipped by the loader; the files you add sit beside it.
