import { render, screen } from '@testing-library/react';
import CVHeader from '../../../components/cv/CVHeader';
import { CVData } from '../../../types/cv';

describe.skip('CVHeader Component', () => {
  const mockPersonalData: CVData['personal'] = {
    name: 'John Doe',
    title: 'Senior Software Engineer',
    location: 'San Francisco, CA',
    email: 'john@example.com',
    website: 'johndoe.com',
    phone: '+1-555-0123',
    summary:
      'Experienced software engineer with 5+ years of experience in full-stack development.',
  };

  it('should render personal information correctly', () => {
    render(<CVHeader personal={mockPersonalData} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('johndoe.com')).toBeInTheDocument();
    expect(screen.getByText('+1-555-0123')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Experienced software engineer with 5+ years of experience in full-stack development.'
      )
    ).toBeInTheDocument();
  });

  it('should render with correct HTML structure', () => {
    render(<CVHeader personal={mockPersonalData} />);

    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('cv-header');

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('John Doe');

    const h2 = screen.getByRole('heading', { level: 2 });
    expect(h2).toHaveTextContent('Senior Software Engineer');
    expect(h2).toHaveClass('cv-title');
  });

  it('should render contact information with proper links', () => {
    render(<CVHeader personal={mockPersonalData} />);

    const emailLink = screen.getByRole('link', { name: 'john@example.com' });
    expect(emailLink).toHaveAttribute('href', 'mailto:john@example.com');

    const websiteLink = screen.getByRole('link', { name: 'johndoe.com' });
    expect(websiteLink).toHaveAttribute('href', 'https://johndoe.com');
    expect(websiteLink).toHaveAttribute('target', '_blank');
    expect(websiteLink).toHaveAttribute('rel', 'noopener noreferrer');

    const phoneLink = screen.getByRole('link', { name: '+1-555-0123' });
    expect(phoneLink).toHaveAttribute('href', 'tel:+1-555-0123');
  });

  it('should render contact labels correctly', () => {
    render(<CVHeader personal={mockPersonalData} />);

    expect(screen.getByText('Location:')).toBeInTheDocument();
    expect(screen.getByText('Email:')).toBeInTheDocument();
    expect(screen.getByText('Website:')).toBeInTheDocument();
    expect(screen.getByText('Phone:')).toBeInTheDocument();
  });

  it('should apply custom className when provided', () => {
    const customClassName = 'custom-header-class';
    render(
      <CVHeader personal={mockPersonalData} className={customClassName} />
    );

    const header = screen.getByRole('banner');
    expect(header).toHaveClass('cv-header', customClassName);
  });

  it('should handle missing phone number', () => {
    const personalDataWithoutPhone: CVData['personal'] = {
      ...mockPersonalData,
      phone: undefined,
    };

    render(<CVHeader personal={personalDataWithoutPhone} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    expect(screen.queryByText('Phone:')).not.toBeInTheDocument();
    expect(screen.queryByText('+1-555-0123')).not.toBeInTheDocument();
  });

  it('should handle empty phone number', () => {
    const personalDataWithEmptyPhone: CVData['personal'] = {
      ...mockPersonalData,
      phone: '',
    };

    render(<CVHeader personal={personalDataWithEmptyPhone} />);

    expect(screen.queryByText('Phone:')).not.toBeInTheDocument();
  });

  it('should handle falsy phone number', () => {
    const personalDataWithFalsyPhone: CVData['personal'] = {
      ...mockPersonalData,
      phone: null as any,
    };

    render(<CVHeader personal={personalDataWithFalsyPhone} />);

    expect(screen.queryByText('Phone:')).not.toBeInTheDocument();
  });

  it('should render summary in correct container', () => {
    render(<CVHeader personal={mockPersonalData} />);

    const summaryContainer = screen
      .getByText(
        'Experienced software engineer with 5+ years of experience in full-stack development.'
      )
      .closest('.cv-summary');
    expect(summaryContainer).toBeInTheDocument();
    expect(summaryContainer).toHaveClass('cv-summary');
  });

  it('should render contact items in correct container', () => {
    render(<CVHeader personal={mockPersonalData} />);

    const contactContainer = screen
      .getByText('Location:')
      .closest('.cv-contact');
    expect(contactContainer).toBeInTheDocument();
    expect(contactContainer).toHaveClass('cv-contact');

    const contactItems = contactContainer?.querySelectorAll('.contact-item');
    expect(contactItems).toHaveLength(4); // Location, Email, Website, Phone
  });

  it('should handle empty strings gracefully', () => {
    const personalDataWithEmptyStrings: CVData['personal'] = {
      name: '',
      title: '',
      location: '',
      email: '',
      website: '',
      summary: '',
    };

    render(<CVHeader personal={personalDataWithEmptyStrings} />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('');
  });

  it('should handle special characters in data', () => {
    const personalDataWithSpecialChars: CVData['personal'] = {
      name: 'José María',
      title: 'Développeur Senior',
      location: 'São Paulo, BR',
      email: 'josé@example.com',
      website: 'josé-maría.dev',
      phone: '+55-11-99999-9999',
      summary: "Développeur avec 5+ ans d'expérience.",
    };

    render(<CVHeader personal={personalDataWithSpecialChars} />);

    expect(screen.getByText('José María')).toBeInTheDocument();
    expect(screen.getByText('Développeur Senior')).toBeInTheDocument();
    expect(screen.getByText('São Paulo, BR')).toBeInTheDocument();
    expect(screen.getByText('josé@example.com')).toBeInTheDocument();
    expect(screen.getByText('josé-maría.dev')).toBeInTheDocument();
    expect(screen.getByText('+55-11-99999-9999')).toBeInTheDocument();
    expect(
      screen.getByText("Développeur avec 5+ ans d'expérience.")
    ).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<CVHeader personal={mockPersonalData} />);

    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();

    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(2);
    expect(headings[0]).toHaveTextContent('John Doe');
    expect(headings[1]).toHaveTextContent('Senior Software Engineer');
  });
});
