import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExportButtons from '../../components/resume/ExportButtons';
import ResumeHeader from '../../components/resume/ResumeHeader';
import { ResumeData } from '../../types/resume';
import * as exportUtils from '../../utils/exportResume';

// Mock the export utilities
jest.mock('../../utils/exportResume');
const mockExportUtils = exportUtils as jest.Mocked<typeof exportUtils>;

// Mock document.getElementById and scrollIntoView
const mockScrollIntoView = jest.fn();
const mockGetElementById = jest.fn();

Object.defineProperty(document, 'getElementById', {
  value: mockGetElementById,
  writable: true,
});

describe.skip('Resume Export Integration', () => {
  const mockResumeData: ResumeData = {
    personal: {
      name: 'John Doe',
      title: 'Senior Software Engineer',
      location: 'San Francisco, CA',
      email: 'john@example.com',
      website: 'https://johndoe.com',
      phone: '+1-555-0123',
      summary: 'Experienced software engineer with 5+ years of experience in full-stack development.',
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
          'Mentored junior developers',
        ],
        skills: ['React', 'Node.js', 'AWS', 'Docker'],
      },
      {
        title: 'Software Engineer',
        company: 'Startup Inc',
        location: 'San Francisco, CA',
        duration: '2018 - 2020',
        description: 'Developed full-stack applications',
        achievements: [
          'Created responsive web applications',
          'Implemented CI/CD pipelines',
        ],
        skills: ['JavaScript', 'Python', 'PostgreSQL'],
      },
    ],
    education: [
      {
        degree: 'Bachelor of Science in Computer Science',
        institution: 'University of California',
        location: 'Berkeley, CA',
        duration: '2014 - 2018',
        gpa: '3.8',
        description: 'Focused on software engineering and algorithms',
        relevantCoursework: ['Data Structures', 'Algorithms', 'Database Systems'],
        achievements: ['Magna Cum Laude', 'Dean\'s List'],
      },
    ],
    skills: {
      technical: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python'],
      soft: ['Leadership', 'Communication', 'Problem Solving'],
      languages: ['English', 'Spanish'],
    },
    certifications: [
      {
        name: 'AWS Certified Solutions Architect',
        issuer: 'Amazon Web Services',
        date: '2021',
      },
      {
        name: 'Certified Kubernetes Administrator',
        issuer: 'Cloud Native Computing Foundation',
        date: '2022',
      },
    ],
  };

  const ResumePage = () => (
    <div>
      <ResumeHeader personal={mockResumeData.personal} />
      <ExportButtons resumeData={mockResumeData} resumeElementId="resume" />
    </div>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetElementById.mockReturnValue({
      scrollIntoView: mockScrollIntoView,
    });
    mockScrollIntoView.mockImplementation(() => {});
    
    // Mock successful exports
    mockExportUtils.exportResumeAsPDF.mockResolvedValue(undefined);
    mockExportUtils.exportResumeAsDOCX.mockResolvedValue(undefined);
    mockExportUtils.exportResumeAsMarkdown.mockReturnValue('# John Doe\n\nSenior Software Engineer');
    mockExportUtils.downloadMarkdown.mockImplementation(() => {});
  });

  describe('Resume Header and Export Integration', () => {
    it('should render both ResumeHeader and ExportButtons together', () => {
      render(<ResumePage />);
      
      // Check ResumeHeader content
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      
      // Check ExportButtons
      expect(screen.getByText('📄 download pdf')).toBeInTheDocument();
      expect(screen.getByText('📝 download docx')).toBeInTheDocument();
      expect(screen.getByText('📝 download markdown')).toBeInTheDocument();
    });

    it('should use consistent data between components', () => {
      render(<ResumePage />);
      
      // Both components should display the same name
      const nameElements = screen.getAllByText('John Doe');
      expect(nameElements).toHaveLength(1); // Only in header
      
      // Export buttons should use the same data
      const pdfButton = screen.getByText('📄 download pdf');
      expect(pdfButton).toBeInTheDocument();
    });
  });

  describe('Search and Navigation Integration', () => {
    it('should search across all resume data and navigate to sections', async () => {
      const user = userEvent.setup();
      render(<ResumePage />);
      
      const searchInput = screen.getByPlaceholderText('search experiences, education, skills...');
      
      // Search for experience
      await user.type(searchInput, 'microservices');
      
      await waitFor(() => {
        expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
        expect(screen.getByText('Tech Corp')).toBeInTheDocument();
      });
      
      // Click on search result
      const resultItem = screen.getByText('Senior Software Engineer');
      fireEvent.click(resultItem);
      
      expect(mockGetElementById).toHaveBeenCalledWith('experience-section');
      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    });

    it('should search education and navigate correctly', async () => {
      const user = userEvent.setup();
      render(<ResumePage />);
      
      const searchInput = screen.getByPlaceholderText('search experiences, education, skills...');
      
      // Search for education
      await user.type(searchInput, 'computer science');
      
      await waitFor(() => {
        expect(screen.getByText('Bachelor of Science in Computer Science')).toBeInTheDocument();
        expect(screen.getByText('University of California')).toBeInTheDocument();
      });
      
      // Click on search result
      const resultItem = screen.getByText('Bachelor of Science in Computer Science');
      fireEvent.click(resultItem);
      
      expect(mockGetElementById).toHaveBeenCalledWith('education-section');
    });

    it('should search skills and navigate correctly', async () => {
      const user = userEvent.setup();
      render(<ResumePage />);
      
      const searchInput = screen.getByPlaceholderText('search experiences, education, skills...');
      
      // Search for skills
      await user.type(searchInput, 'javascript');
      
      await waitFor(() => {
        expect(screen.getByText('JavaScript')).toBeInTheDocument();
      });
      
      // Click on search result
      const resultItem = screen.getByText('JavaScript');
      fireEvent.click(resultItem);
      
      expect(mockGetElementById).toHaveBeenCalledWith('skills-section');
    });

    it('should search certifications and navigate correctly', async () => {
      const user = userEvent.setup();
      render(<ResumePage />);
      
      const searchInput = screen.getByPlaceholderText('search experiences, education, skills...');
      
      // Search for certifications
      await user.type(searchInput, 'aws');
      
      await waitFor(() => {
        expect(screen.getByText('AWS Certified Solutions Architect')).toBeInTheDocument();
        expect(screen.getByText('Amazon Web Services')).toBeInTheDocument();
      });
      
      // Click on search result
      const resultItem = screen.getByText('AWS Certified Solutions Architect');
      fireEvent.click(resultItem);
      
      expect(mockGetElementById).toHaveBeenCalledWith('certifications-section');
    });
  });

  describe('Export Workflow Integration', () => {
    it('should export all formats with consistent data', async () => {
      const user = userEvent.setup();
      render(<ResumePage />);
      
      // Export PDF
      const pdfButton = screen.getByText('📄 download pdf');
      await user.click(pdfButton);
      
      expect(mockExportUtils.exportResumeAsPDF).toHaveBeenCalledWith(
        mockResumeData,
        'John_Doe_Resume.pdf'
      );
      
      // Export DOCX
      const docxButton = screen.getByText('📝 download docx');
      await user.click(docxButton);
      
      expect(mockExportUtils.exportResumeAsDOCX).toHaveBeenCalledWith(
        mockResumeData,
        'John_Doe_Resume.docx'
      );
      
      // Export Markdown
      const markdownButton = screen.getByText('📝 download markdown');
      await user.click(markdownButton);
      
      expect(mockExportUtils.exportResumeAsMarkdown).toHaveBeenCalledWith(mockResumeData);
      expect(mockExportUtils.downloadMarkdown).toHaveBeenCalledWith(
        '# John Doe\n\nSenior Software Engineer',
        'John_Doe_Resume.md'
      );
    });

    it('should handle export loading states correctly', async () => {
      const user = userEvent.setup();
      
      // Mock slow PDF export
      mockExportUtils.exportResumeAsPDF.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(<ResumePage />);
      
      const pdfButton = screen.getByText('📄 download pdf');
      await user.click(pdfButton);
      
      // Should show loading state
      expect(screen.getByText('generating...')).toBeInTheDocument();
      expect(pdfButton).toBeDisabled();
      
      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText('generating...')).not.toBeInTheDocument();
        expect(pdfButton).not.toBeDisabled();
      });
    });

    it('should handle export errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      // Mock PDF export failure
      mockExportUtils.exportResumeAsPDF.mockRejectedValue(new Error('PDF export failed'));
      
      render(<ResumePage />);
      
      const pdfButton = screen.getByText('📄 download pdf');
      await user.click(pdfButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('PDF export failed:', expect.any(Error));
        expect(alertSpy).toHaveBeenCalledWith('Failed to export PDF: PDF export failed');
      });
      
      consoleSpy.mockRestore();
      alertSpy.mockRestore();
    });
  });

  describe('Data Consistency', () => {
    it('should use the same resume data across all operations', () => {
      render(<ResumePage />);
      
      // Verify that the same data is used in both components
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      
      // Search should find the same data
      const searchInput = screen.getByPlaceholderText('search experiences, education, skills...');
      fireEvent.change(searchInput, { target: { value: 'John Doe' } });
      
      // Should not find John Doe in search results (it's in personal info, not searchable)
      expect(screen.queryByText('John Doe')).toBeInTheDocument(); // Still in header
    });

    it('should maintain data integrity during search operations', async () => {
      const user = userEvent.setup();
      render(<ResumePage />);
      
      const searchInput = screen.getByPlaceholderText('search experiences, education, skills...');
      
      // Search for something
      await user.type(searchInput, 'react');
      
      await waitFor(() => {
        expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
      });
      
      // Clear search
      await user.clear(searchInput);
      
      // Original data should still be intact
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    });
  });

  describe('User Experience Flow', () => {
    it('should provide smooth user experience from search to export', async () => {
      const user = userEvent.setup();
      render(<ResumePage />);
      
      // 1. User searches for something
      const searchInput = screen.getByPlaceholderText('search experiences, education, skills...');
      await user.type(searchInput, 'aws');
      
      await waitFor(() => {
        expect(screen.getByText('AWS Certified Solutions Architect')).toBeInTheDocument();
      });
      
      // 2. User clicks on search result (navigates to section)
      const resultItem = screen.getByText('AWS Certified Solutions Architect');
      fireEvent.click(resultItem);
      
      expect(mockGetElementById).toHaveBeenCalledWith('certifications-section');
      
      // 3. User exports the resume
      const pdfButton = screen.getByText('📄 download pdf');
      await user.click(pdfButton);
      
      expect(mockExportUtils.exportResumeAsPDF).toHaveBeenCalledWith(
        mockResumeData,
        'John_Doe_Resume.pdf'
      );
    });

    it('should handle multiple rapid interactions', async () => {
      const user = userEvent.setup();
      render(<ResumePage />);
      
      const searchInput = screen.getByPlaceholderText('search experiences, education, skills...');
      const pdfButton = screen.getByText('📄 download pdf');
      
      // Rapid interactions
      await user.type(searchInput, 'react');
      await user.click(pdfButton);
      await user.clear(searchInput);
      await user.type(searchInput, 'python');
      
      // Should handle all interactions without errors
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
