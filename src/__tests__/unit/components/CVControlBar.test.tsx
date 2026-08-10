import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import CVControlBar from '../../../components/cv/CVControlBar';
import * as exportUtils from '../../../lib/utils/export';
import { CVData } from '../../../types/cv';

// Mock the export utilities
jest.mock('../../../lib/utils/export');
const mockExportUtils = exportUtils as jest.Mocked<typeof exportUtils>;

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

const renderBar = (
  props: Partial<React.ComponentProps<typeof CVControlBar>> = {}
) => {
  const onViewChange = jest.fn();
  const utils = render(
    <CVControlBar
      resumeData={mockCVData}
      view="full"
      onViewChange={onViewChange}
      {...props}
    />
  );
  return { ...utils, onViewChange };
};

const openDownloadMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Download the CV' }));
  return screen.getByRole('listbox', { name: 'Download the CV' });
};

describe('CVControlBar', () => {
  beforeEach(() => {
    mockExportUtils.exportCVAsDOCX.mockResolvedValue(undefined);
    mockExportUtils.exportCVAsMarkdown.mockReturnValue('# Test Resume');
    mockExportUtils.downloadMarkdown.mockImplementation(() => {});
  });

  it('is the two dropdowns and nothing else', () => {
    renderBar();

    expect(
      screen.getByRole('button', { name: 'Choose CV length' })
    ).toHaveTextContent('full cv');
    expect(
      screen.getByRole('button', { name: 'Download the CV' })
    ).toHaveTextContent('download');
    // The row is chrome; the search field lives in its own panel below it.
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(document.querySelector('input')).toBeNull();
  });

  it('shows the current view on the trigger rather than a pair of buttons', () => {
    renderBar({ view: 'resume' });

    expect(
      screen.getByRole('button', { name: 'Choose CV length' })
    ).toHaveTextContent('one page');
    // The old two-button toggle is gone.
    expect(screen.queryByText('full cv')).not.toBeInTheDocument();
  });

  describe('view dropdown', () => {
    it('reports the chosen view and marks the current one selected', async () => {
      const user = userEvent.setup();
      const { onViewChange } = renderBar();

      await user.click(
        screen.getByRole('button', { name: 'Choose CV length' })
      );

      const options = screen.getAllByRole('option');
      expect(options.map(option => option.textContent)).toEqual([
        'full cv',
        'one page',
      ]);
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
      expect(options[1]).toHaveAttribute('aria-selected', 'false');

      await user.click(options[1]);
      expect(onViewChange).toHaveBeenCalledWith('resume');
    });
  });

  describe('download dropdown', () => {
    it('offers the three downloads without showing them until asked', async () => {
      const user = userEvent.setup();
      renderBar();

      expect(screen.queryByText('pdf')).not.toBeInTheDocument();

      await openDownloadMenu(user);

      expect(
        screen.getAllByRole('option').map(option => option.textContent)
      ).toEqual(['pdf', 'docx', 'markdown']);
    });

    // The PDFs are typeset by LaTeX at build time (scripts/build-cv.js), so
    // "pdf" fetches the artifact for the current length rather than
    // generating anything in the browser.
    it('fetches the full-CV artifact by default', async () => {
      const user = userEvent.setup();
      const clicked: Array<{ href: string; download: string }> = [];
      const realCreate = document.createElement.bind(document);
      jest.spyOn(document, 'createElement').mockImplementation(tag => {
        const element = realCreate(tag);
        if (tag === 'a') {
          jest
            .spyOn(element as HTMLAnchorElement, 'click')
            .mockImplementation(() => {
              const anchor = element as HTMLAnchorElement;
              clicked.push({
                href: anchor.getAttribute('href') || '',
                download: anchor.getAttribute('download') || '',
              });
            });
        }
        return element;
      });

      renderBar();
      await openDownloadMenu(user);
      await user.click(screen.getByRole('option', { name: 'pdf' }));

      expect(clicked).toEqual([
        { href: '/cv/alex-nodeland-cv.pdf', download: 'alex-nodeland-cv.pdf' },
      ]);
    });

    it('fetches the one-page artifact in resume view', async () => {
      const user = userEvent.setup();
      const hrefs: string[] = [];
      const realCreate = document.createElement.bind(document);
      jest.spyOn(document, 'createElement').mockImplementation(tag => {
        const element = realCreate(tag);
        if (tag === 'a') {
          jest
            .spyOn(element as HTMLAnchorElement, 'click')
            .mockImplementation(() => {
              hrefs.push(
                (element as HTMLAnchorElement).getAttribute('href') || ''
              );
            });
        }
        return element;
      });

      renderBar({ view: 'resume' });
      await openDownloadMenu(user);
      await user.click(screen.getByRole('option', { name: 'pdf' }));

      expect(hrefs).toEqual(['/cv/alex-nodeland-resume.pdf']);
    });

    it('exports DOCX for the current variant', async () => {
      const user = userEvent.setup();
      renderBar({ view: 'resume' });

      await openDownloadMenu(user);
      await user.click(screen.getByRole('option', { name: 'docx' }));

      expect(mockExportUtils.exportCVAsDOCX).toHaveBeenCalledWith(
        mockCVData,
        'John_Doe_Resume.docx',
        'resume'
      );
    });

    it('exports Markdown through the shared download helper', async () => {
      const user = userEvent.setup();
      renderBar();

      await openDownloadMenu(user);
      await user.click(screen.getByRole('option', { name: 'markdown' }));

      expect(mockExportUtils.exportCVAsMarkdown).toHaveBeenCalledWith(
        mockCVData
      );
      expect(mockExportUtils.downloadMarkdown).toHaveBeenCalledWith(
        '# Test Resume',
        'John_Doe_Resume.md'
      );
    });

    it('reports progress on the trigger while the DOCX is being built', async () => {
      const user = userEvent.setup();
      mockExportUtils.exportCVAsDOCX.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 50))
      );

      renderBar();
      await openDownloadMenu(user);
      await user.click(screen.getByRole('option', { name: 'docx' }));

      expect(
        screen.getByRole('button', { name: 'Download the CV' })
      ).toHaveTextContent('generating...');

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: 'Download the CV' })
        ).toHaveTextContent('download')
      );
    });

    it('surfaces a DOCX failure instead of failing silently', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      mockExportUtils.exportCVAsDOCX.mockRejectedValue(
        new Error('DOCX export failed')
      );

      renderBar();
      await openDownloadMenu(user);
      await user.click(screen.getByRole('option', { name: 'docx' }));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'DOCX export failed:',
          expect.any(Error)
        );
        expect(alertSpy).toHaveBeenCalledWith(
          'Failed to export DOCX: DOCX export failed'
        );
      });
    });

    it('surfaces a Markdown failure instead of failing silently', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      mockExportUtils.exportCVAsMarkdown.mockImplementation(() => {
        throw new Error('Markdown export failed');
      });

      renderBar();
      await openDownloadMenu(user);
      await user.click(screen.getByRole('option', { name: 'markdown' }));

      expect(consoleSpy).toHaveBeenCalledWith(
        'Markdown export failed:',
        expect.any(Error)
      );
      expect(alertSpy).toHaveBeenCalledWith(
        'Failed to export Markdown. Please try again.'
      );
    });

    it('builds the filename from the name on the CV', async () => {
      const user = userEvent.setup();
      const resumeDataWithSpaces = {
        ...mockCVData,
        personal: { ...mockCVData.personal, name: 'John Michael Doe' },
      };

      renderBar({ resumeData: resumeDataWithSpaces });
      await openDownloadMenu(user);
      await user.click(screen.getByRole('option', { name: 'docx' }));

      expect(mockExportUtils.exportCVAsDOCX).toHaveBeenCalledWith(
        resumeDataWithSpaces,
        'John_Michael_Doe_Resume.docx',
        'full'
      );
    });
  });
});
