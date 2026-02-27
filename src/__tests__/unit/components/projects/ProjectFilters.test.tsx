import { fireEvent, render, screen } from '@testing-library/react';
import ProjectFilters from '../../../../components/projects/ProjectFilters';
import type { ProjectCategory, ProjectStatus } from '../../../../config/projects';

describe('ProjectFilters Component', () => {
  const mockOnCategoryChange = jest.fn();
  const mockOnStatusChange = jest.fn();
  const mockOnSearchChange = jest.fn();
  const mockOnClearFilters = jest.fn();

  const defaultProps = {
    selectedCategory: null as ProjectCategory | null,
    selectedStatus: null as ProjectStatus | null,
    searchTerm: '',
    onCategoryChange: mockOnCategoryChange,
    onStatusChange: mockOnStatusChange,
    onSearchChange: mockOnSearchChange,
    onClearFilters: mockOnClearFilters,
    availableCategories: [
      'library',
      'infrastructure',
      'experiment',
    ] as ProjectCategory[],
    availableStatuses: ['active', 'stable', 'archived'] as ProjectStatus[],
    resultCount: 5,
    totalCount: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render filter controls', () => {
    render(<ProjectFilters {...defaultProps} />);

    expect(screen.getByLabelText('category')).toBeInTheDocument();
    expect(screen.getByLabelText('status')).toBeInTheDocument();
    expect(screen.getByLabelText('search')).toBeInTheDocument();
  });

  it('should render category dropdown with all options', () => {
    render(<ProjectFilters {...defaultProps} />);

    const categorySelect = screen.getByLabelText('category');
    expect(categorySelect).toBeInTheDocument();

    // Check for option values
    expect(screen.getByText('all categories')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'library' })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'infrastructure' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'experiment' })
    ).toBeInTheDocument();
  });

  it('should render status dropdown with all options', () => {
    render(<ProjectFilters {...defaultProps} />);

    const statusSelect = screen.getByLabelText('status');
    expect(statusSelect).toBeInTheDocument();

    expect(screen.getByText('all statuses')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'active' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'stable' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'archived' })).toBeInTheDocument();
  });

  it('should call onCategoryChange when category is selected', () => {
    render(<ProjectFilters {...defaultProps} />);

    const categorySelect = screen.getByLabelText('category');
    fireEvent.change(categorySelect, { target: { value: 'library' } });

    expect(mockOnCategoryChange).toHaveBeenCalledWith('library');
  });

  it('should call onCategoryChange with null when "all categories" is selected', () => {
    render(
      <ProjectFilters {...defaultProps} selectedCategory="library" />
    );

    const categorySelect = screen.getByLabelText('category');
    fireEvent.change(categorySelect, { target: { value: '' } });

    expect(mockOnCategoryChange).toHaveBeenCalledWith(null);
  });

  it('should call onStatusChange when status is selected', () => {
    render(<ProjectFilters {...defaultProps} />);

    const statusSelect = screen.getByLabelText('status');
    fireEvent.change(statusSelect, { target: { value: 'active' } });

    expect(mockOnStatusChange).toHaveBeenCalledWith('active');
  });

  it('should call onStatusChange with null when "all statuses" is selected', () => {
    render(<ProjectFilters {...defaultProps} selectedStatus="active" />);

    const statusSelect = screen.getByLabelText('status');
    fireEvent.change(statusSelect, { target: { value: '' } });

    expect(mockOnStatusChange).toHaveBeenCalledWith(null);
  });

  it('should call onSearchChange when search input changes', () => {
    render(<ProjectFilters {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('search projects...');
    fireEvent.change(searchInput, { target: { value: 'test query' } });

    expect(mockOnSearchChange).toHaveBeenCalledWith('test query');
  });

  it('should display results count', () => {
    render(<ProjectFilters {...defaultProps} />);

    expect(screen.getByText('showing 5 of 10 projects')).toBeInTheDocument();
  });

  it('should show clear filters button when filters are active', () => {
    render(
      <ProjectFilters {...defaultProps} selectedCategory="library" />
    );

    expect(screen.getByText('clear filters')).toBeInTheDocument();
  });

  it('should not show clear filters button when no filters are active', () => {
    render(<ProjectFilters {...defaultProps} />);

    expect(screen.queryByText('clear filters')).not.toBeInTheDocument();
  });

  it('should call onClearFilters when clear filters button is clicked', () => {
    render(
      <ProjectFilters {...defaultProps} selectedCategory="library" />
    );

    const clearButton = screen.getByText('clear filters');
    fireEvent.click(clearButton);

    expect(mockOnClearFilters).toHaveBeenCalledTimes(1);
  });

  it('should show clear filters when status filter is active', () => {
    render(<ProjectFilters {...defaultProps} selectedStatus="active" />);

    expect(screen.getByText('clear filters')).toBeInTheDocument();
  });

  it('should show clear filters when search term is active', () => {
    render(<ProjectFilters {...defaultProps} searchTerm="test" />);

    expect(screen.getByText('clear filters')).toBeInTheDocument();
  });

  it('should show clear search button when search term is present', () => {
    render(<ProjectFilters {...defaultProps} searchTerm="test query" />);

    const clearSearchButton = screen.getByLabelText('Clear search');
    expect(clearSearchButton).toBeInTheDocument();
  });

  it('should call onSearchChange with empty string when clear search is clicked', () => {
    render(<ProjectFilters {...defaultProps} searchTerm="test query" />);

    const clearSearchButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearSearchButton);

    expect(mockOnSearchChange).toHaveBeenCalledWith('');
  });

  it('should not show clear search button when search term is empty', () => {
    render(<ProjectFilters {...defaultProps} searchTerm="" />);

    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
  });

  it('should have search icon visible', () => {
    render(<ProjectFilters {...defaultProps} />);

    const searchWrapper = screen
      .getByPlaceholderText('search projects...')
      .closest('.search-input-wrapper');
    expect(searchWrapper?.querySelector('.search-icon')).toBeInTheDocument();
  });

  it('should display selected category value', () => {
    render(
      <ProjectFilters {...defaultProps} selectedCategory="infrastructure" />
    );

    const categorySelect = screen.getByLabelText('category') as HTMLSelectElement;
    expect(categorySelect.value).toBe('infrastructure');
  });

  it('should display selected status value', () => {
    render(<ProjectFilters {...defaultProps} selectedStatus="archived" />);

    const statusSelect = screen.getByLabelText('status') as HTMLSelectElement;
    expect(statusSelect.value).toBe('archived');
  });

  it('should display search term value', () => {
    render(<ProjectFilters {...defaultProps} searchTerm="fugue" />);

    const searchInput = screen.getByPlaceholderText(
      'search projects...'
    ) as HTMLInputElement;
    expect(searchInput.value).toBe('fugue');
  });
});
