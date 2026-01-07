import * as ProjectsExports from '../../../../components/projects';

describe('Projects Components Index', () => {
  it('should export ProjectCard', () => {
    expect(ProjectsExports.ProjectCard).toBeDefined();
    expect(typeof ProjectsExports.ProjectCard).toBe('function');
  });

  it('should export ProjectModal', () => {
    expect(ProjectsExports.ProjectModal).toBeDefined();
    expect(typeof ProjectsExports.ProjectModal).toBe('function');
  });

  it('should export ProjectFilters', () => {
    expect(ProjectsExports.ProjectFilters).toBeDefined();
    expect(typeof ProjectsExports.ProjectFilters).toBe('function');
  });

  it('should export exactly 3 components', () => {
    const exportKeys = Object.keys(ProjectsExports);
    expect(exportKeys).toHaveLength(3);
    expect(exportKeys).toContain('ProjectCard');
    expect(exportKeys).toContain('ProjectModal');
    expect(exportKeys).toContain('ProjectFilters');
  });
});
