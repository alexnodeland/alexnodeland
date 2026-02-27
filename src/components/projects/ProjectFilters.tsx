import React from 'react';
import type { ProjectCategory, ProjectStatus } from '../../config/projects';
import { categoryConfig, statusConfig } from '../../config/projects';

interface ProjectFiltersProps {
  selectedCategory: ProjectCategory | null;
  selectedStatus: ProjectStatus | null;
  searchTerm: string;
  onCategoryChange: (category: ProjectCategory | null) => void;
  onStatusChange: (status: ProjectStatus | null) => void;
  onSearchChange: (search: string) => void;
  onClearFilters: () => void;
  availableCategories: ProjectCategory[];
  availableStatuses: ProjectStatus[];
  resultCount: number;
  totalCount: number;
}

const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  selectedCategory,
  selectedStatus,
  searchTerm,
  onCategoryChange,
  onStatusChange,
  onSearchChange,
  onClearFilters,
  availableCategories,
  availableStatuses,
  resultCount,
  totalCount,
}) => {
  const hasActiveFilters =
    selectedCategory !== null || selectedStatus !== null || searchTerm !== '';

  return (
    <div className="project-filters">
      <div className="filters-row">
        {/* Category dropdown */}
        <div className="filter-group">
          <label htmlFor="category-filter" className="filter-label">
            category
          </label>
          <select
            id="category-filter"
            className="filter-select"
            value={selectedCategory || ''}
            onChange={e =>
              onCategoryChange(
                e.target.value ? (e.target.value as ProjectCategory) : null
              )
            }
          >
            <option value="">all categories</option>
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>
                {categoryConfig[cat].label}
              </option>
            ))}
          </select>
        </div>

        {/* Status dropdown */}
        <div className="filter-group">
          <label htmlFor="status-filter" className="filter-label">
            status
          </label>
          <select
            id="status-filter"
            className="filter-select"
            value={selectedStatus || ''}
            onChange={e =>
              onStatusChange(
                e.target.value ? (e.target.value as ProjectStatus) : null
              )
            }
          >
            <option value="">all statuses</option>
            {availableStatuses.map(status => (
              <option key={status} value={status}>
                {statusConfig[status].label}
              </option>
            ))}
          </select>
        </div>

        {/* Search input */}
        <div className="filter-group search-group">
          <label htmlFor="search-filter" className="filter-label">
            search
          </label>
          <div className="search-input-wrapper">
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="currentColor"
              className="search-icon"
            >
              <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
            </svg>
            <input
              id="search-filter"
              type="text"
              className="filter-input"
              placeholder="search projects..."
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
            />
            {searchTerm && (
              <button
                className="clear-search"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
              >
                <svg
                  viewBox="0 0 16 16"
                  width="12"
                  height="12"
                  fill="currentColor"
                >
                  <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results count and clear button */}
      <div className="filters-footer">
        <span className="results-count">
          showing {resultCount} of {totalCount} projects
        </span>
        {hasActiveFilters && (
          <button className="clear-filters-btn" onClick={onClearFilters}>
            clear filters
          </button>
        )}
      </div>
    </div>
  );
};

export default ProjectFilters;
