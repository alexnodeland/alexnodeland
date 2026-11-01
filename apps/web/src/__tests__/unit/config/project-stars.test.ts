// The star counts on the cards: the deploy's fetched count where there is
// one, the count typed into projects.ts where there is not.

type ProjectsModule = typeof import('../../../config/projects');

const loadWith = (snapshot: object): ProjectsModule => {
  let loaded: ProjectsModule | undefined;
  jest.isolateModules(() => {
    jest.doMock('../../../data/activity.json', () => snapshot);
    loaded = jest.requireActual('../../../config/projects');
  });
  return loaded as ProjectsModule;
};

const byName = (mod: ProjectsModule, name: string) =>
  mod.projectsConfig.projects.find(p => p.name === name);

afterEach(() => {
  jest.dontMock('../../../data/activity.json');
});

describe('project star counts', () => {
  it('keeps the typed counts when the snapshot has no stars', () => {
    const typed = loadWith({});
    const fugue = byName(typed, 'fugue');
    expect(fugue?.stars).toBe(15);
  });

  it('prefers a fetched count, matched by repository name in lowercase', () => {
    const fetched = loadWith({
      stars: { fugue: 99, statusbar: 42, 'curio-rss': 7 },
    });
    expect(byName(fetched, 'fugue')?.stars).toBe(99);
    // The repo is StatusBar; the card is statusbar.
    expect(byName(fetched, 'statusbar')?.stars).toBe(42);
    // The card is curio; the repo is curio-rss.
    expect(byName(fetched, 'curio')?.stars).toBe(7);
  });

  it('falls back per project when a repo is missing from the fetch', () => {
    const partial = loadWith({ stars: { fugue: 99 } });
    expect(byName(partial, 'md-share')?.stars).toBe(5);
  });

  it('takes a fetched zero as zero, not as missing', () => {
    const zero = loadWith({ stars: { bentokaze: 0 } });
    expect(byName(zero, 'bentokaze')?.stars).toBe(0);
  });
});
