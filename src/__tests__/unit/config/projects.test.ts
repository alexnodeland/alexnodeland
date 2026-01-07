import {
  projectsConfig,
  categoryConfig,
  statusConfig,
  getLanguageColor,
  getProjectCategories,
  getProjectStatuses,
} from '../../../config/projects';
import type {
  Project,
  ProjectCategory,
  ProjectStatus,
  ProjectLinkType,
} from '../../../config/projects';

describe('Projects Config', () => {
  describe('projectsConfig', () => {
    it('should have a title', () => {
      expect(projectsConfig.title).toBe('projects');
    });

    it('should have a subtitle', () => {
      expect(projectsConfig.subtitle).toBeTruthy();
      expect(typeof projectsConfig.subtitle).toBe('string');
    });

    it('should have an array of projects', () => {
      expect(Array.isArray(projectsConfig.projects)).toBe(true);
      expect(projectsConfig.projects.length).toBeGreaterThan(0);
    });

    it('should have featured projects', () => {
      const featuredProjects = projectsConfig.projects.filter(p => p.featured);
      expect(featuredProjects.length).toBeGreaterThan(0);
    });

    describe('project structure', () => {
      it('each project should have required fields', () => {
        projectsConfig.projects.forEach((project: Project) => {
          expect(project.id).toBeTruthy();
          expect(project.name).toBeTruthy();
          expect(project.tagline).toBeTruthy();
          expect(project.category).toBeTruthy();
          expect(project.status).toBeTruthy();
          expect(typeof project.featured).toBe('boolean');
          expect(project.description).toBeTruthy();
          expect(Array.isArray(project.links)).toBe(true);
          expect(Array.isArray(project.tags)).toBe(true);
        });
      });

      it('each project should have a unique id', () => {
        const ids = projectsConfig.projects.map(p => p.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      });

      it('each project should have valid category', () => {
        const validCategories: ProjectCategory[] = [
          'library',
          'infrastructure',
          'application',
          'experiment',
          'tool',
          'fork',
          'research',
        ];
        projectsConfig.projects.forEach(project => {
          expect(validCategories).toContain(project.category);
        });
      });

      it('each project should have valid status', () => {
        const validStatuses: ProjectStatus[] = ['active', 'stable', 'archived'];
        projectsConfig.projects.forEach(project => {
          expect(validStatuses).toContain(project.status);
        });
      });

      it('each project link should have valid type and url', () => {
        const validLinkTypes: ProjectLinkType[] = [
          'github',
          'docs',
          'blog',
          'demo',
          'paper',
          'npm',
          'crates',
        ];
        projectsConfig.projects.forEach(project => {
          project.links.forEach(link => {
            expect(validLinkTypes).toContain(link.type);
            expect(link.url).toBeTruthy();
          });
        });
      });

      it('each project should have at least one tag', () => {
        projectsConfig.projects.forEach(project => {
          expect(project.tags.length).toBeGreaterThan(0);
        });
      });
    });

    describe('fork projects', () => {
      it('fork projects should have upstream info', () => {
        const forkProjects = projectsConfig.projects.filter(
          p => p.category === 'fork'
        );
        forkProjects.forEach(project => {
          expect(project.upstream).toBeTruthy();
          expect(project.upstream?.name).toBeTruthy();
          expect(project.upstream?.url).toBeTruthy();
        });
      });
    });
  });

  describe('categoryConfig', () => {
    it('should have config for all categories', () => {
      const categories: ProjectCategory[] = [
        'library',
        'infrastructure',
        'application',
        'experiment',
        'tool',
        'fork',
        'research',
      ];
      categories.forEach(category => {
        expect(categoryConfig[category]).toBeDefined();
        expect(categoryConfig[category].label).toBeTruthy();
        expect(categoryConfig[category].color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('statusConfig', () => {
    it('should have config for all statuses', () => {
      const statuses: ProjectStatus[] = ['active', 'stable', 'archived'];
      statuses.forEach(status => {
        expect(statusConfig[status]).toBeDefined();
        expect(statusConfig[status].label).toBeTruthy();
        expect(statusConfig[status].color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('getLanguageColor', () => {
    it('should return color for known languages', () => {
      expect(getLanguageColor('TypeScript')).toBe('#3178c6');
      expect(getLanguageColor('Python')).toBe('#3572A5');
      expect(getLanguageColor('Rust')).toBe('#dea584');
      expect(getLanguageColor('JavaScript')).toBe('#f1e05a');
    });

    it('should return default color for unknown languages', () => {
      expect(getLanguageColor('UnknownLanguage')).toBe('#6e7681');
      expect(getLanguageColor('')).toBe('#6e7681');
    });

    it('should return valid hex color codes', () => {
      const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
      expect(getLanguageColor('TypeScript')).toMatch(hexColorRegex);
      expect(getLanguageColor('Unknown')).toMatch(hexColorRegex);
    });
  });

  describe('getProjectCategories', () => {
    it('should return an array of categories', () => {
      const categories = getProjectCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    it('should return unique categories from projects', () => {
      const categories = getProjectCategories();
      const uniqueCategories = new Set(categories);
      expect(uniqueCategories.size).toBe(categories.length);
    });

    it('should only include categories that exist in projects', () => {
      const categories = getProjectCategories();
      const projectCategories = new Set(
        projectsConfig.projects.map(p => p.category)
      );
      categories.forEach(category => {
        expect(projectCategories.has(category)).toBe(true);
      });
    });
  });

  describe('getProjectStatuses', () => {
    it('should return an array of statuses', () => {
      const statuses = getProjectStatuses();
      expect(Array.isArray(statuses)).toBe(true);
      expect(statuses.length).toBeGreaterThan(0);
    });

    it('should return unique statuses from projects', () => {
      const statuses = getProjectStatuses();
      const uniqueStatuses = new Set(statuses);
      expect(uniqueStatuses.size).toBe(statuses.length);
    });

    it('should only include statuses that exist in projects', () => {
      const statuses = getProjectStatuses();
      const projectStatuses = new Set(
        projectsConfig.projects.map(p => p.status)
      );
      statuses.forEach(status => {
        expect(projectStatuses.has(status)).toBe(true);
      });
    });
  });
});
