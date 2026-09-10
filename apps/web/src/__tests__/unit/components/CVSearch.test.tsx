import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import CVSearch from '../../../components/cv/CVSearch';
import { CVData } from '../../../types/cv';

const mockCVData: CVData = {
  personal: {
    name: 'John Doe',
    title: 'Software Engineer',
    location: 'San Francisco, CA',
    email: 'john@example.com',
    website: 'https://johndoe.com',
    summary: 'Experienced software engineer.',
  },
  experience: [
    {
      title: 'Senior Software Engineer',
      company: 'Tech Corp',
      location: 'San Francisco, CA',
      duration: '2020 - Present',
      description: 'Led development of web applications',
      achievements: [
        'Built scalable microservices architecture',
        'Improved system performance by 40%',
      ],
      skills: ['React', 'Node.js', 'AWS'],
    },
  ],
  education: [
    {
      degree: 'Bachelor of Science in Computer Science',
      institution: 'University of California',
      location: 'Berkeley, CA',
      duration: '2014 - 2018',
      gpa: '3.8',
      description: 'Focused on software engineering',
      relevantCoursework: ['Data Structures', 'Algorithms'],
      achievements: ['Magna Cum Laude'],
    },
  ],
  skills: {
    technical: ['JavaScript', 'TypeScript', 'React'],
  },
  certifications: [
    {
      name: 'AWS Certified Solutions Architect',
      issuer: 'Amazon Web Services',
      date: '2021',
    },
  ],
};

const SEARCH_PLACEHOLDER = 'search the cv...';

const renderSearch = () => render(<CVSearch resumeData={mockCVData} />);
const input = () => screen.getByPlaceholderText(SEARCH_PLACEHOLDER);

describe('CVSearch', () => {
  it('stays a panel of its own rather than a control in the sticky row', () => {
    const { container } = renderSearch();

    expect(container.querySelector('.cv-search-panel')).toBeInTheDocument();
    expect(input()).toHaveAttribute('type', 'text');
    expect(input()).toHaveAccessibleName('Search the CV');
  });

  it('finds experiences, education, skills and certifications', async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.type(input(), 'microservices');
    await waitFor(() => {
      expect(screen.getByText('experience')).toBeInTheDocument();
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Tech Corp')).toBeInTheDocument();
    });

    await user.clear(input());
    await user.type(input(), 'computer science');
    await waitFor(() => {
      expect(screen.getByText('education')).toBeInTheDocument();
      expect(screen.getByText('University of California')).toBeInTheDocument();
    });

    await user.clear(input());
    await user.type(input(), 'javascript');
    await waitFor(() => {
      expect(screen.getByText('skill')).toBeInTheDocument();
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    await user.clear(input());
    await user.type(input(), 'aws');
    await waitFor(() => {
      expect(screen.getByText('certification')).toBeInTheDocument();
      expect(screen.getByText('Amazon Web Services')).toBeInTheDocument();
    });
  });

  it('says so when nothing matches, and clears with the field', async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.type(input(), 'nonexistent');
    await waitFor(() =>
      expect(
        screen.getByText('no results found for "nonexistent"')
      ).toBeInTheDocument()
    );

    await user.clear(input());
    await waitFor(() =>
      expect(
        screen.queryByText('no results found for "nonexistent"')
      ).not.toBeInTheDocument()
    );
  });

  // The old panel scrolled at `skills-section`, an id nothing on the CV page
  // has ever carried; the real sections are `cv-*`.
  it('scrolls to the section a result lives in', async () => {
    const user = userEvent.setup();
    const scrollIntoView = jest.fn();
    const section = document.createElement('section');
    section.id = 'cv-skills';
    section.scrollIntoView = scrollIntoView;
    document.body.appendChild(section);

    renderSearch();
    await user.type(input(), 'javascript');
    await waitFor(() =>
      expect(screen.getByText('JavaScript')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText('JavaScript'));

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
    expect(input()).toHaveValue('');

    document.body.removeChild(section);
  });

  it('reaches a result from the keyboard', async () => {
    const user = userEvent.setup();
    const scrollIntoView = jest.fn();
    const section = document.createElement('section');
    section.id = 'cv-skills';
    section.scrollIntoView = scrollIntoView;
    document.body.appendChild(section);

    renderSearch();
    await user.type(input(), 'javascript');
    await waitFor(() =>
      expect(screen.getByText('JavaScript')).toBeInTheDocument()
    );

    await user.tab();
    expect(screen.getByRole('button', { name: /JavaScript/ })).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(scrollIntoView).toHaveBeenCalled();
    document.body.removeChild(section);
  });

  it('puts the results away on Escape without clearing the query', async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.type(input(), 'javascript');
    await waitFor(() =>
      expect(screen.getByText('JavaScript')).toBeInTheDocument()
    );

    await user.keyboard('{Escape}');
    expect(screen.queryByText('JavaScript')).not.toBeInTheDocument();
    expect(input()).toHaveValue('javascript');
  });
});
