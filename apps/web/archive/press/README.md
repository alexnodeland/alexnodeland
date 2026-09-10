# Press archive

Local copies of the external articles linked from `src/content/blog/`, kept
because several of these publications are small or defunct-adjacent and the
links are already 7-11 years old. `sbpress.com` in particular is a student
newspaper with no institutional guarantee of staying up.

Retrieved 2026-07-25. Each item has the original page (`.html`/`.pdf`) and, for
HTML, a plain-text extraction (`.txt`) so the words survive even if the markup
or its assets do not.

**Not published, and not committed.** Gatsby only sources `src/pages`,
`src/content/blog` and `src/images`, so nothing here reaches the built site; and
`.gitignore` excludes everything in this directory except this README. Both are
deliberate — these are third-party copyrighted articles, fine to keep as
personal reference copies, not to republish or redistribute. If you ever want an
excerpt on the site, quote a paragraph and link out rather than mirroring the
page.

The files therefore live only on this machine. This README is tracked because
the table below — original URLs paired with Wayback snapshots — is the part
worth version-controlling: it is what lets you rebuild the archive anywhere, and
it survives even if the local copies are lost.

| Article                                                                       | Original                                                                                   | Wayback snapshot                                                                                                                      |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| The Future of Sound (The Stony Brook Press, 2015-11-11)                       | https://sbpress.com/2015/11/the-future-of-sound/                                           | https://web.archive.org/web/20260120052756/https://sbpress.com/2015/11/the-future-of-sound/                                           |
| Supercomputers For Audio Research (CEWIT Newsletter, 2016-02)                 | https://www.cewit.org/programs/_documents/CEWITNewsletter_FEB2016.pdf                      | https://web.archive.org/web/20230723115756/https://www.cewit.org/programs/_documents/CEWITNewsletter_FEB2016.pdf                      |
| Optimal Wavelet Bases (CEWIT Newsletter, 2016-11)                             | https://www.cewit.org/programs/_documents/CEWITNewsletter_NOV2016.pdf                      | https://web.archive.org/web/20230723115819/https://www.cewit.org/programs/_documents/CEWITNewsletter_NOV2016.pdf                      |
| Supercomputing Shouldn't Be Rocket Science (Asian Scientist, 2019-03)         | https://www.asianscientist.com/2019/03/features/supercomputing-shouldnt-be-rocket-science/ | https://web.archive.org/web/20260218032240/https://www.asianscientist.com/2019/03/features/supercomputing-shouldnt-be-rocket-science/ |
| Singapore Startup Hatches At-Scale HPC Dev Cloud (HPCwire, 2019-04-26)        | https://www.hpcwire.com/2019/04/26/singapore-startup-hatches-hpc-dev-cloud/                | https://web.archive.org/web/20250722110011/https://www.hpcwire.com/2019/04/26/singapore-startup-hatches-hpc-dev-cloud/                |
| Try Before You Buy? Test Driving a Supercomputer System (HPCwire, 2019-10-07) | https://www.hpcwire.com/2019/10/07/try-before-you-buy-test-driving-a-supercomputer-system/ | https://web.archive.org/web/20220124003030/https://www.hpcwire.com/2019/10/07/try-before-you-buy-test-driving-a-supercomputer-system/ |

## Notes

- Both HPCwire pages sit behind Cloudflare and will return an "Attention
  Required" interstitial for a request with a terse user-agent. The archive
  script sends a full browser UA, which gets through; if that ever stops
  working it falls back to the Wayback snapshot automatically.
- The CEWIT items are whole newsletters, not standalone articles. The relevant
  pieces are inside the PDFs.

## Re-running

```sh
just archive-press     # refresh local copies and resubmit to the Wayback Machine
```
