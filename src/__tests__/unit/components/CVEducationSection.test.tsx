import { render, screen } from '@testing-library/react';
import CVEducationSection from '../../../components/cv/CVEducationSection';
import { EducationItem } from '../../../types/cv';

describe('CVEducationSection Component', () => {
  const mockEducation: EducationItem[] = [
    {
      degree: "Bachelor's Degree (BS), Applied Mathematics and Statistics",
      institution: 'Stony Brook University',
      location: 'Stony Brook, NY',
      duration: '2013 - 2015',
      gpa: '3.8',
      description:
        'Focused on computational mathematics and statistical analysis.',
      relevantCoursework: [
        'Linear Algebra',
        'Statistics',
        'Discrete Mathematics',
      ],
      achievements: [
        'Member of the University Scholars Program',
        "Dean's List for 4 semesters",
      ],
    },
    {
      degree: 'Doctor of Philosophy (Ph.D.), Computational Applied Mathematics',
      institution: 'MIT',
      location: 'Cambridge, MA',
      duration: '2016 - (Incomplete)',
      description:
        'Engaged in preliminary research but transitioned to entrepreneurial roles prior to advancing to candidacy.',
      relevantCoursework: ['Numerical Analysis', 'Parallel Computing'],
    },
  ];

  it('should render education section with heading', () => {
    render(<CVEducationSection education={mockEducation} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Education' })
    ).toBeInTheDocument();
  });

  it('should render all education items', () => {
    render(<CVEducationSection education={mockEducation} />);

    mockEducation.forEach(edu => {
      expect(screen.getByText(edu.degree)).toBeInTheDocument();
      expect(screen.getByText(edu.institution)).toBeInTheDocument();
      expect(screen.getByText(edu.duration)).toBeInTheDocument();
    });
  });

  it('should render education with all optional fields', () => {
    render(<CVEducationSection education={mockEducation} />);

    const firstEdu = mockEducation[0];

    // Check GPA
    expect(screen.getByText(`GPA: ${firstEdu.gpa}`)).toBeInTheDocument();

    // Check description
    expect(screen.getByText(firstEdu.description!)).toBeInTheDocument();

    // Check relevant coursework
    expect(screen.getAllByText('coursework:').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText('Linear Algebra • Statistics • Discrete Mathematics')
    ).toBeInTheDocument();

    // Check achievements
    firstEdu.achievements!.forEach(achievement => {
      expect(screen.getByText(achievement)).toBeInTheDocument();
    });
  });

  it('should not render optional fields when not provided', () => {
    const minimalEducation: EducationItem[] = [
      {
        degree: 'Bachelor of Science',
        institution: 'University',
        location: 'City, ST',
        duration: '2020 - 2024',
      },
    ];

    render(<CVEducationSection education={minimalEducation} />);

    expect(screen.queryByText(/GPA:/)).not.toBeInTheDocument();
    expect(screen.queryByText('coursework:')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument(); // No achievements list
  });

  it('should not render GPA when not provided', () => {
    const educationWithoutGPA: EducationItem[] = [
      {
        degree: 'Bachelor of Science',
        institution: 'University',
        location: 'City, ST',
        duration: '2020 - 2024',
      },
    ];

    render(<CVEducationSection education={educationWithoutGPA} />);

    expect(screen.queryByText(/GPA:/)).not.toBeInTheDocument();
  });

  it('should not render description when not provided', () => {
    const educationWithoutDescription: EducationItem[] = [
      {
        degree: 'Bachelor of Science',
        institution: 'University',
        location: 'City, ST',
        duration: '2020 - 2024',
      },
    ];

    render(<CVEducationSection education={educationWithoutDescription} />);

    // Should not render any paragraph
    expect(screen.queryByText(/Focused on|Engaged in/)).not.toBeInTheDocument();
  });

  it('should not render coursework when not provided or empty', () => {
    const educationWithoutCoursework: EducationItem[] = [
      {
        degree: 'Bachelor of Science',
        institution: 'University',
        location: 'City, ST',
        duration: '2020 - 2024',
      },
    ];

    render(<CVEducationSection education={educationWithoutCoursework} />);

    expect(screen.queryByText('coursework:')).not.toBeInTheDocument();
  });

  it('should not render achievements when not provided or empty', () => {
    const educationWithoutAchievements: EducationItem[] = [
      {
        degree: 'Bachelor of Science',
        institution: 'University',
        location: 'City, ST',
        duration: '2020 - 2024',
      },
    ];

    render(<CVEducationSection education={educationWithoutAchievements} />);

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CVEducationSection
        education={mockEducation}
        className="custom-education-class"
      />
    );

    const section = container.querySelector('section');
    expect(section).toHaveClass('education-section', 'custom-education-class');
  });

  it('should have correct structure', () => {
    const { container } = render(
      <CVEducationSection education={mockEducation} />
    );

    const section = container.querySelector('section');
    expect(section).toHaveClass('education-section');

    const educationItems = container.querySelectorAll('.cv-card.cv-collapse');
    expect(educationItems).toHaveLength(mockEducation.length);

    const educationHeaders = container.querySelectorAll('.education-header');
    expect(educationHeaders).toHaveLength(mockEducation.length);

    const educationInstitutions = container.querySelectorAll(
      '.education-institution'
    );
    expect(educationInstitutions).toHaveLength(mockEducation.length);
  });

  it('should handle empty education array', () => {
    render(<CVEducationSection education={[]} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Education' })
    ).toBeInTheDocument();
    // Should not have any education items
    const { container } = render(<CVEducationSection education={[]} />);
    const educationItems = container.querySelectorAll('.cv-card.cv-collapse');
    expect(educationItems).toHaveLength(0);
  });

  it('should render single education item correctly', () => {
    const singleEducation: EducationItem[] = [mockEducation[0]];

    render(<CVEducationSection education={singleEducation} />);

    expect(screen.getByText(singleEducation[0].degree)).toBeInTheDocument();
    expect(
      screen.getByText(singleEducation[0].institution)
    ).toBeInTheDocument();
    expect(screen.getByText(singleEducation[0].duration)).toBeInTheDocument();
  });

  it('should handle education with empty achievements array', () => {
    const educationWithEmptyAchievements: EducationItem[] = [
      {
        degree: 'Bachelor of Science',
        institution: 'University',
        location: 'City, ST',
        duration: '2020 - 2024',
        achievements: [],
      },
    ];

    render(<CVEducationSection education={educationWithEmptyAchievements} />);

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('should handle education with empty coursework array', () => {
    const educationWithEmptyCoursework: EducationItem[] = [
      {
        degree: 'Bachelor of Science',
        institution: 'University',
        location: 'City, ST',
        duration: '2020 - 2024',
        relevantCoursework: [],
      },
    ];

    render(<CVEducationSection education={educationWithEmptyCoursework} />);

    expect(screen.queryByText('coursework:')).not.toBeInTheDocument();
  });

  it('should handle special characters and formatting in education data', () => {
    const specialEducation: EducationItem[] = [
      {
        degree: 'Master of Science (M.S.) in Computer Science & Engineering',
        institution: 'École Polytechnique',
        location: 'Paris, France',
        duration: '2018 - 2020',
        description:
          'Specialization in AI & Machine Learning with focus on deep learning.',
        relevantCoursework: [
          'Algorithms & Data Structures',
          'Machine Learning & AI',
        ],
        achievements: [
          'Summa Cum Laude',
          'Best Thesis Award - "Neural Networks"',
        ],
      },
    ];

    render(<CVEducationSection education={specialEducation} />);

    expect(
      screen.getByText(
        'Master of Science (M.S.) in Computer Science & Engineering'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('École Polytechnique')).toBeInTheDocument();
    expect(
      screen.getByText('Algorithms & Data Structures • Machine Learning & AI')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Best Thesis Award - "Neural Networks"')
    ).toBeInTheDocument();
  });
});
