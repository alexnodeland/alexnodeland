import { render, screen } from '@testing-library/react';
import CVSkillsSection from '../../../components/cv/CVSkillsSection';
import { CVData } from '../../../types/cv';

describe('CVSkillsSection Component', () => {
  const mockSkills: CVData['skills'] = {
    technical: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
    soft: ['Leadership', 'Communication', 'Problem Solving'],
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

  it('should render soft skills', () => {
    render(<CVSkillsSection skills={mockSkills} />);

    expect(
      screen.getByRole('heading', { level: 3, name: 'Soft Skills' })
    ).toBeInTheDocument();

    mockSkills.soft.forEach(skill => {
      expect(screen.getByText(skill)).toBeInTheDocument();
      expect(screen.getByText(skill)).toHaveClass('skill-tag', 'soft');
    });
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
    expect(skillCategories).toHaveLength(2); // technical, soft
  });

  it('should handle empty skill arrays gracefully', () => {
    const emptySkills: CVData['skills'] = {
      technical: [],
      soft: [],
    };

    render(<CVSkillsSection skills={emptySkills} />);

    // Headers should still be present
    expect(
      screen.getByRole('heading', { level: 3, name: 'Technical Skills' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Soft Skills' })
    ).toBeInTheDocument();
  });

  it('should handle single skill in each category', () => {
    const singleSkills: CVData['skills'] = {
      technical: ['JavaScript'],
      soft: ['Leadership'],
    };

    render(<CVSkillsSection skills={singleSkills} />);

    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('Leadership')).toBeInTheDocument();
  });

  it('should handle skills with special characters', () => {
    const specialSkills: CVData['skills'] = {
      technical: ['C++', 'C#', '.NET', 'Node.js'],
      soft: ['Problem-solving', 'Team-building'],
    };

    render(<CVSkillsSection skills={specialSkills} />);

    specialSkills.technical.forEach(skill => {
      expect(screen.getByText(skill)).toBeInTheDocument();
    });

    specialSkills.soft.forEach(skill => {
      expect(screen.getByText(skill)).toBeInTheDocument();
    });
  });
});
