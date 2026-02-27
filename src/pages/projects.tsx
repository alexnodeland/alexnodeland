import React, { useState, useMemo, useEffect } from 'react';
import { Layout, SEO, ProjectCard, ProjectModal, ProjectFilters } from '../components';
import {
  projectsConfig,
  getProjectCategories,
  getProjectStatuses,
} from '../config';
import type { Project, ProjectCategory, ProjectStatus } from '../config';
import '../styles/projects.scss';

const ProjectsPage: React.FC = () => {
  // Filter state
  const [selectedCategory, setSelectedCategory] =
    useState<ProjectCategory | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get available categories and statuses
  const availableCategories = useMemo(() => getProjectCategories(), []);
  const availableStatuses = useMemo(() => getProjectStatuses(), []);

  // Featured projects (unaffected by filters)
  const featuredProjects = useMemo(
    () => projectsConfig.projects.filter(p => p.featured),
    []
  );

  // Non-featured projects (for catalog)
  const catalogProjects = useMemo(
    () => projectsConfig.projects.filter(p => !p.featured),
    []
  );

  // Filtered catalog projects
  const filteredProjects = useMemo(() => {
    return catalogProjects.filter(project => {
      // Category filter
      if (selectedCategory && project.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (selectedStatus && project.status !== selectedStatus) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesName = project.name.toLowerCase().includes(search);
        const matchesTagline = project.tagline.toLowerCase().includes(search);
        const matchesTags = project.tags.some(tag =>
          tag.toLowerCase().includes(search)
        );
        if (!matchesName && !matchesTagline && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [catalogProjects, selectedCategory, selectedStatus, searchTerm]);

  // Sort filtered projects: active first, then stable, then archived, then alphabetically
  const sortedProjects = useMemo(() => {
    const statusOrder: Record<ProjectStatus, number> = {
      active: 0,
      stable: 1,
      archived: 2,
    };

    return [...filteredProjects].sort((a, b) => {
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return a.name.localeCompare(b.name);
    });
  }, [filteredProjects]);

  // URL params handling
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const category = params.get('category') as ProjectCategory | null;
      const status = params.get('status') as ProjectStatus | null;
      const search = params.get('search');

      if (category && availableCategories.includes(category)) {
        setSelectedCategory(category);
      }
      if (status && availableStatuses.includes(status)) {
        setSelectedStatus(status);
      }
      if (search) {
        setSearchTerm(search);
      }
    }
  }, [availableCategories, availableStatuses]);

  // Update URL params when filters change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams();
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedStatus) params.set('status', selectedStatus);
      if (searchTerm) params.set('search', searchTerm);

      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;

      window.history.replaceState({}, '', newUrl);
    }
  }, [selectedCategory, selectedStatus, searchTerm]);

  const handleClearFilters = () => {
    setSelectedCategory(null);
    setSelectedStatus(null);
    setSearchTerm('');
  };

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
  };

  return (
    <Layout>
      <SEO
        title="projects"
        description="technical projects and open source work by alex nodeland — probabilistic programming, agent frameworks, audio synthesis, and development infrastructure."
      />
      <div className="projects-page">
        {/* Header */}
        <header className="projects-header">
          <h1>{projectsConfig.title}</h1>
          <p>{projectsConfig.subtitle}</p>
        </header>

        {/* Featured Section */}
        {featuredProjects.length > 0 && (
          <section className="projects-section featured-section">
            <h2 className="section-title">featured</h2>
            <div className="projects-grid featured-grid">
              {featuredProjects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  featured
                  onClick={() => handleProjectClick(project)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Catalog Section */}
        <section className="projects-section catalog-section">
          <h2 className="section-title">catalog</h2>

          {/* Filters */}
          <ProjectFilters
            selectedCategory={selectedCategory}
            selectedStatus={selectedStatus}
            searchTerm={searchTerm}
            onCategoryChange={setSelectedCategory}
            onStatusChange={setSelectedStatus}
            onSearchChange={setSearchTerm}
            onClearFilters={handleClearFilters}
            availableCategories={availableCategories}
            availableStatuses={availableStatuses}
            resultCount={sortedProjects.length}
            totalCount={catalogProjects.length}
          />

          {/* Projects Grid */}
          {sortedProjects.length > 0 ? (
            <div className="projects-grid catalog-grid">
              {sortedProjects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => handleProjectClick(project)}
                />
              ))}
            </div>
          ) : (
            <div className="no-results">
              <p>no projects match your current filters.</p>
              <button className="clear-filters-btn" onClick={handleClearFilters}>
                clear filters
              </button>
            </div>
          )}
        </section>

        {/* GitHub CTA */}
        <div className="github-cta">
          <p>want to see more?</p>
          <a
            href="https://github.com/alexnodeland"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
          >
            <svg
              viewBox="0 0 16 16"
              width="20"
              height="20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
            </svg>
            <span>view all repositories on github</span>
          </a>
        </div>
      </div>

      {/* Project Modal */}
      <ProjectModal
        project={selectedProject}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </Layout>
  );
};

export default ProjectsPage;
