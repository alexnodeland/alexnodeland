/**
 * The arithmetic behind `npm run score:cv`, on fabricated inputs. The script
 * itself needs a typeset PDF, the OpenResume clone and the embedding model;
 * none of that is needed to prove the sums are right, and this is where a
 * wrong sum would otherwise hide, behind numbers that look plausible.
 */
const {
  TOLERANCE,
  parseProfile,
  requirementsOf,
  compileLexicon,
  termsIn,
  documentFrequency,
  keywordCoverage,
  resumeUnits,
  semanticCoverage,
  parseabilityOf,
  regressions,
} = require('../../../../scripts/lib/cv-score.js');

type Check = { name: string; ok: boolean };
type Regression = { metric: string };

const PROFILE = `---
id: fde-01
family: fde
title: Forward Deployed Engineer
years_experience: "5+"
---

## About the role
An engineer who ships.

## Responsibilities
- Own delivery end to end.
- Feed field learnings back.

## Required qualifications
- Strong Python.

## Preferred qualifications
- None listed separately.
`;

describe('parseProfile', () => {
  it('reads the frontmatter, unquoting values', () => {
    const profile = parseProfile(PROFILE);
    expect(profile.meta).toMatchObject({
      id: 'fde-01',
      family: 'fde',
      years_experience: '5+',
    });
  });

  it('collects the bullets per section and skips an empty section’s placeholder', () => {
    const profile = parseProfile(PROFILE);
    expect(requirementsOf(profile)).toEqual([
      'Own delivery end to end.',
      'Feed field learnings back.',
      'Strong Python.',
    ]);
    expect(profile.sections['Preferred qualifications']).toEqual([]);
  });

  it('keeps the whole body as text for the keyword score', () => {
    expect(parseProfile(PROFILE).text).toContain('An engineer who ships.');
  });
});

describe('the lexicon', () => {
  const lexicon = compileLexicon({
    terms: {
      typescript: ['typescript', 'ts'],
      evals: ['eval', 'evals', 'evaluation'],
      'vector search': ['vector search', 'search'],
      'c++': ['c++'],
      'ci/cd': ['ci/cd'],
      agents: ['agent', 'agents'],
    },
  });

  it('matches whole words only', () => {
    // "ts" as a substring is in "agents"; "eval" as a substring is in
    // "evaluation". Neither is a match, and "evaluation" is.
    expect([...termsIn('agents', lexicon)]).toEqual(['agents']);
    expect([...termsIn('an evaluation', lexicon)]).toEqual(['evals']);
    expect(termsIn('agentypescript', lexicon).size).toBe(0);
  });

  it('is case-insensitive and copes with punctuation in a term', () => {
    expect([...termsIn('C++ and CI/CD.', lexicon)].sort()).toEqual([
      'c++',
      'ci/cd',
    ]);
    expect(termsIn('c+++', lexicon).has('c++')).toBe(false);
  });

  it('counts each term once per profile, by any alias', () => {
    const profiles = [
      { text: 'evals, evals, evals and TypeScript' },
      { text: 'an evaluation' },
      { text: 'nothing relevant' },
    ];
    const frequency = documentFrequency(profiles, lexicon);
    expect(frequency.get('evals')).toBe(2);
    expect(frequency.get('typescript')).toBe(1);
    expect(frequency.has('agents')).toBe(false);
  });

  it('weights coverage by how many profiles ask, and lists what is missing', () => {
    const frequency = new Map([
      ['evals', 3],
      ['typescript', 1],
      ['agents', 2],
    ]);
    const { score, present, missing } = keywordCoverage(
      'I run evals on agents',
      frequency,
      lexicon
    );
    expect(score).toBeCloseTo(5 / 6);
    expect(present).toEqual(['agents', 'evals']);
    expect(missing).toEqual([{ term: 'typescript', profiles: 1 }]);
  });

  it('scores zero against a family that asks for nothing', () => {
    expect(keywordCoverage('anything', new Map(), lexicon).score).toBe(0);
  });
});

describe('resumeUnits', () => {
  it('reads the summary by sentence, every bullet, each project and the skills line', () => {
    const units = resumeUnits({
      personal: { summary: 'One. Two! Three?' },
      experience: [
        {
          title: 'Engineer',
          company: 'Acme',
          achievements: ['Built X', 'Ran Y'],
        },
      ],
      projects: [{ name: 'fugue', description: 'a library' }],
      skills: { technical: ['Python', 'Rust'] },
    } as never);
    expect(units).toEqual([
      'One.',
      'Two!',
      'Three?',
      'Engineer, Acme',
      'Built X',
      'Ran Y',
      'fugue: a library',
      'Python, Rust',
    ]);
  });
});

describe('semanticCoverage', () => {
  const unit = (x: number, y: number) => new Float32Array([x, y]);

  it('takes the nearest unit per requirement, and reports the mean and the share over the threshold', () => {
    const requirements = [unit(1, 0), unit(0, 1)];
    const units = [unit(1, 0), unit(Math.SQRT1_2, Math.SQRT1_2)];
    const { score, coverage, nearest } = semanticCoverage(
      requirements,
      units,
      0.9
    );
    expect(nearest[0]).toBeCloseTo(1);
    expect(nearest[1]).toBeCloseTo(Math.SQRT1_2);
    expect(score).toBeCloseTo((1 + Math.SQRT1_2) / 2);
    expect(coverage).toBe(0.5);
  });

  it('is zero with nothing on either side', () => {
    expect(semanticCoverage([], [unit(1, 0)], 0.5).score).toBe(0);
    expect(semanticCoverage([unit(1, 0)], [], 0.5).score).toBe(0);
  });
});

describe('parseabilityOf', () => {
  const data = {
    personal: { name: 'Alex Nodeland', email: 'alex@example.com' },
    experience: [
      { title: 'Engineer', company: 'Acme', duration: '2024 - Present' },
      { title: 'Founder', company: 'Beta', duration: '2019 - 2023' },
    ],
    education: [{ institution: 'Stony Brook University' }],
  } as never;

  it('is full marks when every field comes back', () => {
    const { score, checks } = parseabilityOf(
      {
        profile: { name: 'Alex Nodeland', email: 'alex@example.com' },
        workExperiences: [
          { company: 'Engineer, Acme', jobTitle: '', date: '2024 - Present' },
          { company: 'Founder, Beta', jobTitle: '', date: '2019 - 2023' },
        ],
        educations: [{ school: 'Stony Brook University', degree: '' }],
        skills: { descriptions: ['Python, Rust'] },
      },
      data
    );
    expect(score).toBe(1);
    expect(checks.every((c: Check) => c.ok)).toBe(true);
  });

  it('charges a job whose date landed on the wrong year, and a job it never saw', () => {
    const { score, checks } = parseabilityOf(
      {
        profile: { name: 'Alex Nodeland', email: 'alex@example.com' },
        workExperiences: [
          // The second job's date attached to the first: the quiet failure.
          { company: 'Engineer, Acme', jobTitle: '', date: '2019 - 2023' },
        ],
        educations: [{ school: 'Stony Brook University', degree: '' }],
        skills: { descriptions: ['Python'] },
      },
      data
    );
    const failed = checks.filter((c: Check) => !c.ok).map((c: Check) => c.name);
    expect(failed).toEqual([
      'job count',
      'date: Engineer, Acme',
      'job: Founder, Beta',
      'date: Founder, Beta',
    ]);
    // 9 checks: name, email, count, 2 × (job, date), school, skills.
    expect(score).toBeCloseTo(5 / 9);
  });
});

describe('regressions', () => {
  const baseline = {
    fde: {
      parseability: 1,
      families: { fde: { keywords: 0.685, semantic: 0.69 } },
    },
  };

  it('finds nothing when every score holds or improves', () => {
    expect(
      regressions(
        {
          fde: {
            parseability: 1,
            families: { fde: { keywords: 0.7, semantic: 0.69 } },
          },
        },
        baseline
      )
    ).toEqual([]);
  });

  it('fails a drop in parseability or keywords by any amount', () => {
    const found = regressions(
      {
        fde: {
          parseability: 0.95,
          families: { fde: { keywords: 0.684, semantic: 0.69 } },
        },
      },
      baseline
    );
    expect(found.map((r: Regression) => r.metric)).toEqual([
      'parseability',
      'keywords',
    ]);
  });

  it('lets the semantic score drift within its tolerance, and no further', () => {
    const drift = (semantic: number) =>
      regressions(
        {
          fde: {
            parseability: 1,
            families: { fde: { keywords: 0.685, semantic } },
          },
        },
        baseline
      );
    expect(drift(0.69 - TOLERANCE.semantic)).toEqual([]);
    expect(drift(0.69 - TOLERANCE.semantic - 0.001)).toHaveLength(1);
  });

  it('passes a document or family the baseline has never seen', () => {
    expect(
      regressions(
        {
          'music-tech': {
            parseability: 0.5,
            families: { 'music-tech': { keywords: 0.1, semantic: 0.1 } },
          },
          fde: {
            parseability: 1,
            families: {
              fde: { keywords: 0.685, semantic: 0.69 },
              'ai-engineer': { keywords: 0, semantic: 0 },
            },
          },
        },
        baseline
      )
    ).toEqual([]);
  });
});
