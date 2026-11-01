import type { DropdownOption } from '../ui/Dropdown';
import type { GitHubProject } from '../../config';

// What the projects page and the apps page share: the sort picker's options,
// the sort, and the search. Both pages are the same kind of list over the
// same config, so they sort and search the same way.

export type ProjectSort = 'curated' | 'stars' | 'name';

// Curated is the config's own order — hand-ranked within each section — so it
// is the default, and it is named rather than left implicit.
export const SORT_OPTIONS: DropdownOption[] = [
  { value: 'curated', label: 'curated' },
  { value: 'stars', label: 'most starred' },
  { value: 'name', label: 'name a–z' },
];

// A picker's "no filter" option. The rest of a page keys off a real category
// or platform, so this is the stand-in the dropdown needs.
export const ALL = '__all__';

export const sortProjects = (
  projects: GitHubProject[],
  sort: ProjectSort
): GitHubProject[] => {
  if (sort === 'curated') return projects;
  const sorted = [...projects];
  if (sort === 'stars') {
    // Unstarred repos are worth 0 rather than worth nothing, so they sort to
    // the bottom instead of dropping out of the comparison.
    sorted.sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0));
  } else {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
  return sorted;
};

export const matchesSearch = (
  project: GitHubProject,
  term: string
): boolean => {
  if (!term) return true;
  const haystack =
    `${project.name} ${project.description} ${project.tags.join(' ')}`.toLowerCase();
  return haystack.includes(term);
};
