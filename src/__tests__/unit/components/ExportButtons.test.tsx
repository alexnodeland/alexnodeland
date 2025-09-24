import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExportButtons from '../../../components/resume/ExportButtons';
import { ResumeData } from '../../../types/resume';
import * as exportUtils from '../../../utils/exportResume';

// Mock the export utilities
jest.mock('../../../utils/exportResume');
const mockExportUtils = exportUtils as jest.Mocked<typeof exportUtils>;

// Mock document.getElementById and scrollIntoView
const mockScrollIntoView = jest.fn();
const mockGetElementById = jest.fn();

Object.defineProperty(document, 'getElementById', {
  value: mockGetElementById,
  writable: true,
});

describe('ExportButtons Component', () => {
  const mockResumeData: ResumeData = {
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
      soft: ['Leadership', 'Communication'],
      languages: ['English', 'Spanish'],
    },
    certifications: [
      {
        name: 'AWS Certified Solutions Architect',
        issuer: 'Amazon Web Services',
        date: '2021',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetElementById.mockReturnValue({
      scrollIntoView: mockScrollIntoView,
    });
    mockScrollIntoView.mockImplementation(() => {});
  });

  it('should render export buttons correctly', () => {
    render(<ExportButtons resumeData={mockResumeData} resumeElementId="resume" />);
    
    expect(screen.getByText('📄 download pdf')).toBeInTheDocument();
    expect(screen.getByText('📝 download docx')).toBeInTheDocument();
    expect(screen.getByText('📝 download markdown')).toBeInTheDocument();
  });

  it('should render search input', () => {
    render(<ExportButtons resumeData={mockResumeData} resumeElementId="resume" />);
    
    const searchInput = screen.getByPlaceholderText('search experiences, education, skills...');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('type', 'text');
  });

  it('should apply custom className when provided', () => {
    const customClassName = 'custom-export-class';
    render(<ExportButtons resumeData={mockResumeData} resumeElementId="resume" className={customClassName} />);
    
    const container = screen.getByText('📄 download pdf').closest('.export-buttons');
    expect(container).toHaveClass('export-buttons', customClassName);
  });

  describe('Search Functionality', () => {
    it('should search experiences correctly', async () => {
      const user = userEvent.setup();
      render(<ExportButtons resumeData={mockResumeData} resumeElementId="resume" />);
      
      const searchInput = screen.getByPlaceholderText('search experiences, education, skills...');
      await user.type(searchInput, 'microservices');
      
      await waitFor(() => {
        expect(screen.getByText('experience')).toBeInTheDocument();
        expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
        expect(screen.getByText('Tech Corp')).toBeInTheDocument();
      });
    });

    it('should search education correctly', async () => {
      const user = userEvent.setup();
      render(<ExportButtons resumeData={mockResumeData} resumeElementId="resume" />);
      
      const searchInput = screen.getByPlaceholderText('search experiences, education, skills...');
      await user.type(searchInput, 'computer science');
      
      await waitFor(() => {
        expect(screen.getByText('education')).toBeInTheDocument();
        expect(screen.getByText('Bachelor of Science in Computer Science')).toBeInTheDocument();
        expect(screen.getByText('University of California')).toBeInTheDocument();
      });
    });

    it('should search skills correctly', async () => {
      const user = userEvent.setup();
      render(<ExportButtons resumeData={mockResumeData} resumeElementId="resume" />);
      
      const searchInput = screen.getByPlaceholderText('search experiences, education, skills...');
      await user.type(searchInput, 'javascript');
      
      await waitFor(() => {
        expect(screen.getByText('skill')).toBeInTheDocument();
        expect(screen.getByText('JavaScript')).toBeInTheDocument();
      });
    });

    it('should search certifications correctly', async () => {
      const user = userEvent.setup();
      render(<ExportButtons resumeData={mockResumeData} resumeElementId="resume" />);
      
      const searchInput = screen.getByPlaceholderText('search experiences, education, skills...');
      await user.type(searchInput, 'aws');
      
      await waitFor(() => {
        expect(screen.getByText('certification')).toBeInTheDocument();
        expect(screen.getByText('AWS Certified Solutions Architect')).toBeInTheDocument();
        expect(screen.getByText('Amazon Web Services')).toBeInTheDocument();
      });
    });

    it('should show no results message when no matches found', async () => {
      const user = userEvent.setup();
      render(<ExportButtons resumeData={mockResumeData} resumeElementId="resume" />);
      
      const searchInput = screen.getByPlaceholderText('search experiences, education, skills...');
      await user.type(searchInput, 'nonexistent');
      
      await waitFor(() => {
        expect(screen.getByText('no results found for "nonexistent"')).toBeInTheDocument();
      });
    });

    it('should clear search results when input is empty', async () => {
      const user = userEvent.setup();
      render(<ExportButtons resumeData={mockResumeData} resumeElementId="resume" />);
      
      const searchInput = screen.getByPlaceholderText('search experiences, education, skills...');
      
      // Type something to show results
      await user.type(searchInput, 'javascript');
      await waitFor(() => {
        expect(screen.getByText('JavaScript')).toBeInTheDocument();
      });
      
      // Clear input
      await user.clear(searchInput);
      
      await waitFor(() => {
        expect(screen.queryByText('JavaScript')).not.toBeInTheDocument();
      });
    });

    it('should scroll to section when search result is clicked', async () => {
      const user = userEvent.setup();
      render(<ExportButtons resumeData={mockResumeData} resumeElementId="resume" />);
      
      const searchInput = screen.getByPlaceholderText('search experiences, education, skills...');
      await user.type(searchInput, 'javascript');
      
      await waitFor(() => {
        const resultItem = screen.getByText('JavaScript');
        fireEvent.click(resultItem);
      });
      
      expect(mockGetElementById).toHaveBeenCalledWith('skills-section');
      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    });
  });

  describe('Export Functionality', () => {
    beforeEach(() => {
      mockExportUtils.exportResumeAsPDF.mockResolvedValue(undefined);
      mockExportUtils.exportResumeAsDOCX.mockResolvedValue(undefined);
      mockExportUtils.exportResumeAsMarkdown.mockReturnValue('# Test Resume');
      mockExportUtils.downloadMarkdown.mockImplementation(() => {});
    });

    it('should export PDF when PDF button is clicked', async () => {
      const user = userEvent.setup();
      render(<ExportButtons resumeData={mockResumeData} resumeElementId="resume" />);
      
      const pdfButton = screen.getByText('📄 download pdf');
      await user.click(pdfButton);
      
      expect(mockExportUtils.exportResumeAsPDF).toHaveBeenCalledWith(
        mockResumeData,
        'John_Doe_Resume.pdf'
      );
    });

    it('should export DOCX when DOCX button is clicked', async () => {
      const user = userEvent.setup();
      render(<ExportButtons resumeData={mockResumeData} resumeElementId="resume" />);
      
      const docxButton = screen.getByText('📝 download docx');
      await user.click(docxButton);
      
      expect(mockExportUtils.exportResumeAsDOCX).toHaveBeenCalledWith(
        mockResumeData,
        'John_Doe_Resume.docx'
      );
    });

    it('should export Markdown when Markdown button is clicked', async () => {
      const user = userEvent.setup();
      render(<ExportButtons resumeData={mockResumeData} resumeElementId="resume" />);
      
      const markdownButton = screen.getByText('📝 download markdown');
      await user.click(markdownButton);
      
      expect(mockExportUtils.exportResumeAsMarkdown).toHaveBeenCalledWith(mockResumeData);
      expect(mockExportUtils.downloadMarkdown).toHaveBeenCalledWith(
        '# Test Resume',
        'John_Doe_Resume.md'
      );
    });

    it('should show loading state during PDF export', async () => {
      const user = userEvent.setup();
      mockExportUtils.exportResumeAsPDF.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(<ExportButtons resumeData={mockResumeData} resumeElementId="resume" />);
      
      const pdfButton = screen.getByText('📄 download pdf');
      await user.click(pdfButton);
      
      expect(screen.getAllByText('generating...')).toHaveLength(2);
      const loadingPdfButton = screen.getAllByText('generating...')[0];
      expect(loadingPdfButton).toBeDisabled();
    });

    it('should show loading state during DOCX export', async () => {
      const user = userEvent.setup();
      mockExportUtils.exportResumeAsDOCX.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(<ExportButtons resumeData={mockResumeData} resumeElementId="resume" />);
      
      const docxButton = screen.getByText('📝 download docx');
      await user.click(docxButton);
      
      expect(screen.getAllByText('generating...')).toHaveLength(2);
      const loadingDocxButton = screen.getAllByText('generating...')[1];
      expect(loadingDocxButton).toBeDisabled();
    });

    it('should handle PDF export errors', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      mockExportUtils.exportResumeAsPDF.mockRejectedValue(new Error('PDF export failed'));
      
      render(<ExportButtons resumeData={mockResumeData} resumeElementId="resume" />);
      
      const pdfButton = screen.getByText('📄 download pdf');
      await user.click(pdfButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('PDF export failed:', expect.any(Error));
        expect(alertSpy).toHaveBeenCalledWith('Failed to export PDF: PDF export failed');
      });
      
      consoleSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it('should handle DOCX export errors', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      mockExportUtils.exportResumeAsDOCX.mockRejectedValue(new Error('DOCX export failed'));
      
      render(<ExportButtons resumeData={mockResumeData} resumeElementId="resume" />);
      
      const docxButton = screen.getByText('📝 download docx');
      await user.click(docxButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('DOCX export failed:', expect.any(Error));
        expect(alertSpy).toHaveBeenCalledWith('Failed to export DOCX: DOCX export failed');
      });
      
      consoleSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it('should handle Markdown export errors', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      mockExportUtils.exportResumeAsMarkdown.mockImplementation(() => {
        throw new Error('Markdown export failed');
      });
      
      render(<ExportButtons resumeData={mockResumeData} resumeElementId="resume" />);
      
      const markdownButton = screen.getByText('📝 download markdown');
      await user.click(markdownButton);
      
      expect(consoleSpy).toHaveBeenCalledWith('Markdown export failed:', expect.any(Error));
      expect(alertSpy).toHaveBeenCalledWith('Failed to export Markdown. Please try again.');
      
      consoleSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it('should handle names with spaces in filename', async () => {
      const user = userEvent.setup();
      const resumeDataWithSpaces = {
        ...mockResumeData,
        personal: {
          ...mockResumeData.personal,
          name: 'John Michael Doe',
        },
      };
      
      render(<ExportButtons resumeData={resumeDataWithSpaces} resumeElementId="resume" />);
      
      const pdfButton = screen.getByText('📄 download pdf');
      await user.click(pdfButton);
      
      expect(mockExportUtils.exportResumeAsPDF).toHaveBeenCalledWith(
        resumeDataWithSpaces,
        'John_Michael_Doe_Resume.pdf'
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles', () => {
      render(<ExportButtons resumeData={mockResumeData} resumeElementId="resume" />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
    });

    it('should disable buttons during export', async () => {
      const user = userEvent.setup();
      mockExportUtils.exportResumeAsPDF.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(<ExportButtons resumeData={mockResumeData} resumeElementId="resume" />);
      
      const pdfButton = screen.getByText('📄 download pdf');
      await user.click(pdfButton);
      
      expect(pdfButton).toBeDisabled();
    });
  });
});
