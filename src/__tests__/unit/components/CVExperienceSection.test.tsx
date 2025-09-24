import { render, screen } from '@testing-library/react';
import CVExperienceSection from '../../../components/cv/CVExperienceSection';
import { ExperienceItem } from '../../../types/cv';

describe('CVExperienceSection Component', () => {
  const mockExperiences: ExperienceItem[] = [
    {
      title: 'Senior Software Engineer',
      company: 'Tech Corp',
      location: 'San Francisco, CA',
      duration: '2022 - Present',
      description: 'Leading development of scalable web applications.',
      achievements: [
        'Led team of 5 developers',
        'Increased performance by 40%',
        'Implemented CI/CD pipeline',
      ],
      skills: ['JavaScript', 'React', 'Node.js'],
    },
    {
      title: 'Software Engineer',
      company: 'StartupXYZ',
      location: 'Remote',
      duration: '2020 - 2022',
      achievements: ['Built MVP from scratch', 'Reduced load time by 50%'],
    },
  ];

  it('should render experience section with heading', () => {
    render(<CVExperienceSection experiences={mockExperiences} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Experience' })
    ).toBeInTheDocument();
  });

  it('should render all experience items', () => {
    render(<CVExperienceSection experiences={mockExperiences} />);

    mockExperiences.forEach(exp => {
      expect(
        screen.getByText(`${exp.title}, ${exp.company}`)
      ).toBeInTheDocument();
      expect(screen.getByText(exp.location)).toBeInTheDocument();
      expect(screen.getByText(exp.duration)).toBeInTheDocument();
    });
  });

  it('should render experience with all optional fields', () => {
    render(<CVExperienceSection experiences={mockExperiences} />);

    const firstExp = mockExperiences[0];

    // Check description
    expect(screen.getByText(firstExp.description!)).toBeInTheDocument();

    // Check achievements
    firstExp.achievements.forEach(achievement => {
      expect(screen.getByText(achievement)).toBeInTheDocument();
    });

    // Check skills
    expect(screen.getByText('Key Skills:')).toBeInTheDocument();
    expect(screen.getByText('JavaScript, React, Node.js')).toBeInTheDocument();
  });

  it('should not render description when not provided', () => {
    render(<CVExperienceSection experiences={mockExperiences} />);

    // Second experience doesn't have description
    expect(
      screen.queryByText(/StartupXYZ description/)
    ).not.toBeInTheDocument();
  });

  it('should not render skills when not provided or empty', () => {
    const experienceWithoutSkills: ExperienceItem[] = [
      {
        title: 'Developer',
        company: 'Company',
        location: 'City, ST',
        duration: '2021 - 2022',
        achievements: ['Built things'],
      },
    ];

    render(<CVExperienceSection experiences={experienceWithoutSkills} />);

    expect(screen.queryByText('Key Skills:')).not.toBeInTheDocument();
  });

  it('should not render skills when empty array', () => {
    const experienceWithEmptySkills: ExperienceItem[] = [
      {
        title: 'Developer',
        company: 'Company',
        location: 'City, ST',
        duration: '2021 - 2022',
        achievements: ['Built things'],
        skills: [],
      },
    ];

    render(<CVExperienceSection experiences={experienceWithEmptySkills} />);

    expect(screen.queryByText('Key Skills:')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CVExperienceSection
        experiences={mockExperiences}
        className="custom-experience-class"
      />
    );

    const section = container.querySelector('section');
    expect(section).toHaveClass(
      'experience-section',
      'custom-experience-class'
    );
  });

  it('should have correct structure', () => {
    const { container } = render(
      <CVExperienceSection experiences={mockExperiences} />
    );

    const section = container.querySelector('section');
    expect(section).toHaveClass('experience-section');

    const experienceItems = container.querySelectorAll('.experience-item');
    expect(experienceItems).toHaveLength(mockExperiences.length);

    const experienceHeaders = container.querySelectorAll('.experience-header');
    expect(experienceHeaders).toHaveLength(mockExperiences.length);

    const experienceLocations = container.querySelectorAll(
      '.experience-location'
    );
    expect(experienceLocations).toHaveLength(mockExperiences.length);
  });

  it('should handle empty experiences array', () => {
    render(<CVExperienceSection experiences={[]} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Experience' })
    ).toBeInTheDocument();

    // Should not have any experience items
    const { container } = render(<CVExperienceSection experiences={[]} />);
    const experienceItems = container.querySelectorAll('.experience-item');
    expect(experienceItems).toHaveLength(0);
  });

  it('should render single experience item correctly', () => {
    const singleExperience: ExperienceItem[] = [mockExperiences[0]];

    render(<CVExperienceSection experiences={singleExperience} />);

    expect(
      screen.getByText(
        `${singleExperience[0].title}, ${singleExperience[0].company}`
      )
    ).toBeInTheDocument();
    expect(screen.getByText(singleExperience[0].location)).toBeInTheDocument();
    expect(screen.getByText(singleExperience[0].duration)).toBeInTheDocument();
  });

  it('should handle special characters and formatting in experience data', () => {
    const specialExperience: ExperienceItem[] = [
      {
        title: 'Senior Engineer & Team Lead',
        company: 'Société Générale',
        location: 'Paris, France',
        duration: '2019 - 2021',
        description: 'Led development of high-performance trading systems.',
        achievements: [
          'Reduced latency by 99.9%',
          'Managed €1B+ in daily transactions',
        ],
        skills: ['C++', 'Python', 'Low-latency systems'],
      },
    ];

    render(<CVExperienceSection experiences={specialExperience} />);

    expect(
      screen.getByText('Senior Engineer & Team Lead, Société Générale')
    ).toBeInTheDocument();
    expect(screen.getByText('Paris, France')).toBeInTheDocument();
    expect(screen.getByText('Reduced latency by 99.9%')).toBeInTheDocument();
    expect(
      screen.getByText('Managed €1B+ in daily transactions')
    ).toBeInTheDocument();
    expect(
      screen.getByText('C++, Python, Low-latency systems')
    ).toBeInTheDocument();
  });

  it('should render achievements as list items', () => {
    render(<CVExperienceSection experiences={mockExperiences} />);

    const achievementLists = screen.getAllByRole('list');
    expect(achievementLists.length).toBeGreaterThanOrEqual(1);

    // Check that achievements are rendered as list items
    const listItems = screen.getAllByRole('listitem');
    expect(listItems.length).toBeGreaterThanOrEqual(
      mockExperiences[0].achievements.length +
        mockExperiences[1].achievements.length
    );
  });

  it('should handle experiences with only required fields', () => {
    const minimalExperience: ExperienceItem[] = [
      {
        title: 'Developer',
        company: 'Company',
        location: 'City, ST',
        duration: '2021 - 2022',
        achievements: ['Did development work'],
      },
    ];

    render(<CVExperienceSection experiences={minimalExperience} />);

    expect(screen.getByText('Developer, Company')).toBeInTheDocument();
    expect(screen.getByText('City, ST')).toBeInTheDocument();
    expect(screen.getByText('2021 - 2022')).toBeInTheDocument();
    expect(screen.getByText('Did development work')).toBeInTheDocument();

    // Should not render optional fields
    expect(screen.queryByText('Key Skills:')).not.toBeInTheDocument();

    // Check that description paragraph is not rendered
    const { container } = render(
      <CVExperienceSection experiences={minimalExperience} />
    );
    const descriptionElement = container.querySelector(
      '.experience-description'
    );
    expect(descriptionElement).not.toBeInTheDocument();
  });
});
