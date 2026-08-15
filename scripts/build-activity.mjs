#!/usr/bin/env node
/**
 * Builds `src/data/activity.json` — the GitHub activity snapshot the projects
 * page renders as the contribution heatmap and metric tiles.
 *
 * Fetching happens here, at build time, never in the visitor's browser. The
 * token stays in CI; the site only ever ships the aggregated numbers. A
 * snapshot is committed so credential-less builds (tests, local dev, forks)
 * still render a real panel — without a token this script leaves it untouched.
 *
 * What each token tier buys:
 *   - no token:          committed snapshot, unchanged
 *   - Actions token:     public activity only (private work appears solely in
 *                        the calendar squares, because the profile's "include
 *                        private contributions" setting folds them in there)
 *   - PAT w/ repo read:  private repos included in commits, PRs, and lines
 *
 * Usage: ACTIVITY_TOKEN=... node scripts/build-activity.mjs
 *        (locally: GITHUB_TOKEN="$(gh auth token)" npm run build:activity)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src', 'data', 'activity.json');

const LOGIN = process.env.ACTIVITY_LOGIN || 'alexnodeland';
const TOKEN =
  process.env.ACTIVITY_TOKEN ||
  process.env.GITHUB_TOKEN ||
  process.env.GH_TOKEN;

// The GraphQL search API stops paginating at 1,000 results; past that the
// lines-changed sum is a floor, and we say so instead of pretending.
const MAX_PR_PAGES = 10;

const LEVELS = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

async function graphql(query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
  const body = await res.json();
  if (body.errors) throw new Error(`GraphQL: ${JSON.stringify(body.errors)}`);
  return body.data;
}

async function rest(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) throw new Error(`REST HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchCalendar() {
  const data = await graphql(
    `
      query ($login: String!) {
        user(login: $login) {
          contributionsCollection {
            totalCommitContributions
            restrictedContributionsCount
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  date
                  contributionCount
                  contributionLevel
                }
              }
            }
          }
        }
      }
    `,
    { login: LOGIN }
  );
  const col = data.user.contributionsCollection;
  return {
    total: col.contributionCalendar.totalContributions,
    weeks: col.contributionCalendar.weeks.map(w =>
      w.contributionDays.map(d => ({
        date: d.date,
        count: d.contributionCount,
        level: LEVELS[d.contributionLevel] ?? 0,
      }))
    ),
  };
}

async function fetchMergedPRs() {
  const q = `is:pr author:${LOGIN} is:merged`;
  let cursor = null;
  let total = 0;
  let counted = 0;
  let additions = 0;
  let deletions = 0;
  for (let page = 0; page < MAX_PR_PAGES; page++) {
    const data = await graphql(
      `
        query ($q: String!, $cursor: String) {
          search(query: $q, type: ISSUE, first: 100, after: $cursor) {
            issueCount
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              ... on PullRequest {
                additions
                deletions
              }
            }
          }
        }
      `,
      { q, cursor }
    );
    const s = data.search;
    total = s.issueCount;
    for (const node of s.nodes) {
      if (!node) continue;
      counted++;
      additions += node.additions || 0;
      deletions += node.deletions || 0;
    }
    if (!s.pageInfo.hasNextPage) break;
    cursor = s.pageInfo.endCursor;
  }
  if (counted < total) {
    console.warn(
      `activity: lines counted over ${counted} of ${total} merged PRs (search pagination cap)`
    );
  }
  return { total, counted, additions, deletions };
}

async function fetchCommitCount() {
  const data = await rest(
    `https://api.github.com/search/commits?q=${encodeURIComponent(
      `author:${LOGIN}`
    )}&per_page=1`
  );
  return data.total_count;
}

async function main() {
  if (!TOKEN) {
    if (fs.existsSync(OUT)) {
      console.warn(
        'activity: no ACTIVITY_TOKEN/GITHUB_TOKEN — keeping committed snapshot'
      );
      return;
    }
    throw new Error(
      'activity: no token and no committed snapshot at src/data/activity.json'
    );
  }

  const [calendar, prs, commits] = await Promise.all([
    fetchCalendar(),
    fetchMergedPRs(),
    fetchCommitCount(),
  ]);

  const snapshot = {
    generatedAt: new Date().toISOString(),
    login: LOGIN,
    calendar,
    metrics: {
      commits,
      mergedPRs: prs.total,
      linesAdded: prs.additions,
      linesDeleted: prs.deletions,
      linesCountedOverPRs: prs.counted,
    },
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(
    `activity: ${calendar.total} contributions, ${commits} commits, ` +
      `${prs.total} merged PRs, +${prs.additions}/-${prs.deletions} lines → ${path.relative(ROOT, OUT)}`
  );
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
