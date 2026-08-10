import { render, screen } from '@testing-library/react';
import CVSkillsSection from '../../../components/cv/CVSkillsSection';
import { CVData } from '../../../types/cv';

describe('CVSkillsSection Component', () => {
  const mockSkills: CVData['skills'] = {
    technical: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
  };

  it('should render skills section with heading', () => {
    render(<CVSkillsSection skills={mockSkills} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Skills' })
    ).toBeInTheDocument();
  });

  it('should render technical skills', () => {
    render(<CVSkillsSection skills={mockSkills} />);

    expect(
      screen.getByRole('heading', { level: 3, name: 'Technical Skills' })
    ).toBeInTheDocument();

    mockSkills.technical.forEach(skill => {
      expect(screen.getByText(skill)).toBeInTheDocument();
      expect(screen.getByText(skill)).toHaveClass('skill-tag', 'technical');
    });
  });

  // Soft skills were dropped from the CV entirely — see the note in
  // CVSkillsSection. The section renders one category now.
  it('should not render a soft skills category', () => {
    render(<CVSkillsSection skills={mockSkills} />);

    expect(
      screen.queryByRole('heading', { level: 3, name: 'Soft Skills' })
    ).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CVSkillsSection skills={mockSkills} className="custom-skills-class" />
    );

    const section = container.querySelector('section');
    expect(section).toHaveClass('skills-section', 'custom-skills-class');
  });

  it('should have correct structure', () => {
    const { container } = render(<CVSkillsSection skills={mockSkills} />);

    const section = container.querySelector('section');
    expect(section).toHaveClass('skills-section');

    const skillCategories = container.querySelectorAll(
      '.skill-category-direct'
    );
    expect(skillCategories).toHaveLength(1); // technical only
  });

  it('should handle empty skill arrays gracefully', () => {
    const emptySkills: CVData['skills'] = {
      technical: [],
    };

    render(<CVSkillsSection skills={emptySkills} />);

    // Header should still be present
    expect(
      screen.getByRole('heading', { level: 3, name: 'Technical Skills' })
    ).toBeInTheDocument();
  });

  it('should handle a single skill', () => {
    const singleSkills: CVData['skills'] = {
      technical: ['JavaScript'],
    };

    render(<CVSkillsSection skills={singleSkills} />);

    expect(screen.getByText('JavaScript')).toBeInTheDocument();
  });

  it('should handle skills with special characters', () => {
    const specialSkills: CVData['skills'] = {
      technical: ['C++', 'C#', '.NET', 'Node.js'],
    };

    render(<CVSkillsSection skills={specialSkills} />);

    specialSkills.technical.forEach(skill => {
      expect(screen.getByText(skill)).toBeInTheDocument();
    });
  });
});
