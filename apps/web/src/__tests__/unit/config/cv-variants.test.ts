import {
  CVSource,
  CV_ARTIFACTS,
  buildVariant,
  cvPdfPath,
  cvSource,
  unknownProjectNames,
} from '../../../config/cv';

// A source small enough to reason about. The real `cvSource` is exercised
// further down, but a rule is easier to pin here than in eleven real roles.
const fixture: CVSource = {
  personal: {
    name: 'Test Person',
    title: 'Default Title',
    email: 'test@example.com',
    location: 'Somewhere',
    website: 'example.com',
    summary: 'Default summary.',
    summaryByVariant: { fde: 'FDE summary.' },
    titleByVariant: { fde: 'FDE Title' },
  },
  experience: [
    {
      title: 'Engineer',
      company: 'Current Co',
      location: 'Remote',
      duration: '2024 - Present',
      engagement: 'full-time',
      achievements: [
        'neutral one',
        { text: 'exec one', tags: ['exec'] },
        { text: 'fde one', tags: ['fde'] },
        { text: 'fde with a metric, 40%', tags: ['fde'], metric: '40%' },
        { text: 'fde only', tags: ['fde'], audienceOnly: true },
      ],
      variants: {
        resume: { maxBullets: 2 },
        fde: { maxBullets: 3 },
        'ai-engineer': { maxBullets: 1, collapse: true },
      },
    },
    {
      title: 'Older',
      company: 'Past Co',
      location: 'Elsewhere',
      duration: '2010 - 2012',
      achievements: ['ancient history'],
      // No `variants`, so the one-pagers leave it off entirely.
    },
  ],
  education: [
    {
      degree: 'BS',
      institution: 'A University',
      location: 'Town',
      duration: '2006 - 2010',
      relevantCoursework: ['Something'],
    },
  ],
  certifications: [{ name: 'A Cert', issuer: 'Someone', date: '2015' }],
  skills: {
    technical: [
      'Default Skill',
      { name: 'AI Skill', tags: ['ai-eng'] },
      { name: 'AI Only Skill', tags: ['ai-eng'], audienceOnly: true },
      { name: 'FDE Skill', tags: ['fde'] },
    ],
  },
  projects: { fde: ['fugue'] },
};

describe('buildVariant', () => {
  it('gives the full CV every role and every bullet, in source order', () => {
    const full = buildVariant('full', fixture);

    expect(full.experience).toHaveLength(2);
    expect(full.experience[0].achievements).toEqual([
      'neutral one',
      'exec one',
      'fde one',
      'fde with a metric, 40%',
    ]);
    // Nothing is reordered when nothing has to fit, and nothing is filtered
    // but the audience-only bullet.
    expect(full.personal.summary).toBe('Default summary.');
    expect(full.personal.title).toBe('Default Title');
    expect(full.certifications).toHaveLength(1);
    expect(full.education[0].relevantCoursework).toBeDefined();
  });

  it('drops roles that do not name the variant', () => {
    for (const variant of ['resume', 'fde', 'ai-engineer'] as const) {
      const built = buildVariant(variant, fixture);
      expect(built.experience.map(r => r.company)).toEqual(['Current Co']);
    }
  });

  it('keeps an audience-only bullet off every document but its audience’s', () => {
    // Room for everything, so what is missing is withheld, not trimmed.
    const roomy: CVSource = {
      ...fixture,
      experience: fixture.experience.map(role => ({
        ...role,
        variants: role.variants && {
          ...role.variants,
          resume: { maxBullets: 9 },
        },
      })),
    };
    expect(
      buildVariant('full', roomy).experience[0].achievements
    ).not.toContain('fde only');
    expect(
      buildVariant('resume', roomy).experience[0].achievements
    ).not.toContain('fde only');
    expect(buildVariant('fde', roomy).experience[0].achievements).toContain(
      'fde only'
    );
    // A bullet written for an audience, without the flag, is still on the
    // general documents.
    expect(buildVariant('resume', roomy).experience[0].achievements).toContain(
      'fde one'
    );
  });

  it('selects the skills line by tag, in authored order', () => {
    expect(buildVariant('ai-engineer', fixture).skills.technical).toEqual([
      'Default Skill',
      'AI Skill',
      'AI Only Skill',
    ]);
    expect(buildVariant('fde', fixture).skills.technical).toEqual([
      'Default Skill',
      'FDE Skill',
    ]);
    // The general documents carry a tagged skill and not an audience-only one.
    expect(buildVariant('full', fixture).skills.technical).toEqual([
      'Default Skill',
      'AI Skill',
      'FDE Skill',
    ]);
  });

  it('withholds exec bullets from the engineering-focused variants', () => {
    const fde = buildVariant('fde', fixture);
    expect(fde.experience[0].achievements).not.toContain('exec one');

    // The neutral one-pager filters on no audience, so an exec bullet is still
    // eligible there — given room for it.
    const roomy: CVSource = {
      ...fixture,
      experience: fixture.experience.map(role => ({
        ...role,
        variants: role.variants && {
          ...role.variants,
          resume: { maxBullets: 4 },
        },
      })),
    };
    expect(buildVariant('resume', roomy).experience[0].achievements).toContain(
      'exec one'
    );
  });

  it('leads with on-audience bullets, and prefers a metric within them', () => {
    const fde = buildVariant('fde', fixture);

    // Both tagged bullets beat the neutral one; the one carrying a figure
    // beats the one that does not, despite being authored after it.
    expect(fde.experience[0].achievements).toEqual([
      'fde with a metric, 40%',
      'fde one',
      'fde only',
    ]);
  });

  it('cuts a collapsed role to exactly one bullet, never none', () => {
    const ai = buildVariant('ai-engineer', fixture);
    const role = ai.experience[0];

    expect(role.collapsed).toBe(true);
    // One rather than zero: two entry lines back to back have no boundary for
    // a parser to split jobs on, and the role below gets swallowed.
    expect(role.achievements).toHaveLength(1);
  });

  it('carries the engagement type through to the rendered role', () => {
    expect(buildVariant('fde', fixture).experience[0].engagement).toBe(
      'full-time'
    );
  });

  it('prefers the per-variant summary and title, and falls back', () => {
    const fde = buildVariant('fde', fixture);
    expect(fde.personal.summary).toBe('FDE summary.');
    expect(fde.personal.title).toBe('FDE Title');

    const resume = buildVariant('resume', fixture);
    expect(resume.personal.summary).toBe('Default summary.');
    expect(resume.personal.title).toBe('Default Title');
  });

  it('drops coursework and certifications from the one-pagers', () => {
    const resume = buildVariant('resume', fixture);
    expect(resume.certifications).toEqual([]);
    expect(resume.education[0].relevantCoursework).toBeUndefined();
  });

  it('resolves named projects against the projects config', () => {
    const fde = buildVariant('fde', fixture);
    expect(fde.projects).toHaveLength(1);
    expect(fde.projects?.[0]).toMatchObject({
      name: 'fugue',
      github: 'https://github.com/alexnodeland/fugue',
    });

    // A variant that names none gets no section at all, rather than an empty one.
    expect(buildVariant('resume', fixture).projects).toBeUndefined();
  });
});

describe('the real CV source', () => {
  it('names only projects that exist', () => {
    expect(unknownProjectNames()).toEqual([]);
  });

  it('keeps every one-pager to the roles of the last decade', () => {
    for (const variant of ['resume', 'fde', 'ai-engineer'] as const) {
      const built = buildVariant(variant);
      expect(built.experience.length).toBeLessThan(cvSource.experience.length);
      expect(built.experience.length).toBeGreaterThan(0);
    }
  });

  it('never puts an exec bullet on a role-specific page', () => {
    const execBullets = cvSource.experience.flatMap(role =>
      role.achievements
        .filter(b => typeof b !== 'string' && b.tags?.includes('exec'))
        .map(b => (typeof b === 'string' ? b : b.text))
    );
    expect(execBullets.length).toBeGreaterThan(0);

    for (const variant of ['fde', 'ai-engineer'] as const) {
      const shown = buildVariant(variant).experience.flatMap(
        r => r.achievements
      );
      for (const bullet of execBullets) {
        // An `exec` bullet may also carry the variant's own tag, in which case
        // it is deliberately eligible; what must not happen is an exec-only
        // bullet appearing here.
        const source = cvSource.experience
          .flatMap(r => r.achievements)
          .find(b => typeof b !== 'string' && b.text === bullet);
        const tags = typeof source === 'string' ? [] : (source?.tags ?? []);
        const execOnly = tags.length === 1 && tags[0] === 'exec';
        if (execOnly) expect(shown).not.toContain(bullet);
      }
    }
  });

  it('gives every variant an artifact path the build writes', () => {
    for (const variant of Object.keys(CV_ARTIFACTS) as Array<
      keyof typeof CV_ARTIFACTS
    >) {
      expect(cvPdfPath(variant)).toBe(`/cv/${CV_ARTIFACTS[variant].name}.pdf`);
    }
    // The one-pagers are one page; the full CV is allowed to run.
    expect(CV_ARTIFACTS.full.maxPages).toBeNull();
    expect(CV_ARTIFACTS.fde.maxPages).toBe(1);
  });

  it('states the education without an "incomplete" qualifier', () => {
    const degrees = cvSource.education.map(e => e.degree).join(' ');
    expect(degrees).not.toMatch(/incomplete/i);
    expect(degrees).toContain('Graduate Studies');
  });
});
