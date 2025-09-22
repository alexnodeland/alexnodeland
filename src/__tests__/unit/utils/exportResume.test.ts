// Mock the modules first
jest.mock('jspdf', () => {
  const mockPdf = {
    setFontSize: jest.fn().mockReturnThis(),
    setFont: jest.fn().mockReturnThis(),
    splitTextToSize: jest.fn().mockReturnValue(['test line']),
    text: jest.fn().mockReturnThis(),
    line: jest.fn().mockReturnThis(),
    setLineWidth: jest.fn().mockReturnThis(),
    addPage: jest.fn().mockReturnThis(),
    save: jest.fn().mockReturnThis(),
  };
  
  return {
    __esModule: true,
    default: jest.fn(() => mockPdf),
  };
});

jest.mock('docx', () => ({
  Document: jest.fn(),
  Packer: {
    toArrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
  },
  Paragraph: jest.fn(),
  TextRun: jest.fn(),
  AlignmentType: { CENTER: 'center' },
}));

jest.mock('file-saver', () => ({
  saveAs: jest.fn(),
}));

jest.mock('html2canvas', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({
    toDataURL: jest.fn().mockReturnValue('data:image/png;base64,test'),
  }),
}));

import {
  exportResumeAsPDF,
  exportResumeAsMarkdown,
  exportResumeAsDOCX,
  downloadMarkdown,
} from '../../../utils/exportResume';
import { ResumeData } from '../../../types/resume';

// Get the mocked modules
const mockJsPDF = require('jspdf').default;
const mockDocument = require('docx').Document;
const mockPacker = require('docx').Packer;
const mockSaveAs = require('file-saver').saveAs;
const mockHtml2Canvas = require('html2canvas').default;

describe('exportResume Utility Functions', () => {
  const mockResumeData: ResumeData = {
    personal: {
      name: 'John Doe',
      title: 'Software Engineer',
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exportResumeAsPDF', () => {
    it('should create PDF with correct structure', async () => {
      await exportResumeAsPDF(mockResumeData, 'test-resume.pdf');

      expect(mockJsPDF).toHaveBeenCalledWith('p', 'mm', 'a4');
      const mockPdfInstance = mockJsPDF.mock.results[0].value;
      expect(mockPdfInstance.save).toHaveBeenCalledWith('test-resume.pdf');
    });

    it('should handle resume data correctly', async () => {
      await exportResumeAsPDF(mockResumeData);

      const mockPdfInstance = mockJsPDF.mock.results[0].value;
      // Check that text methods were called
      expect(mockPdfInstance.setFontSize).toHaveBeenCalled();
      expect(mockPdfInstance.setFont).toHaveBeenCalled();
      expect(mockPdfInstance.text).toHaveBeenCalled();
      expect(mockPdfInstance.splitTextToSize).toHaveBeenCalled();
    });

    it('should use default filename when not provided', async () => {
      await exportResumeAsPDF(mockResumeData);

      const mockPdfInstance = mockJsPDF.mock.results[0].value;
      expect(mockPdfInstance.save).toHaveBeenCalledWith('resume.pdf');
    });

    it('should handle errors gracefully', async () => {
      // Reset the mock to get a fresh instance
      mockJsPDF.mockClear();
      const mockPdfInstance = {
        setFontSize: jest.fn().mockReturnThis(),
        setFont: jest.fn().mockReturnThis(),
        splitTextToSize: jest.fn().mockReturnValue(['test line']),
        text: jest.fn().mockReturnThis(),
        line: jest.fn().mockReturnThis(),
        setLineWidth: jest.fn().mockReturnThis(),
        addPage: jest.fn().mockReturnThis(),
        save: jest.fn().mockImplementation(() => {
          throw new Error('PDF generation failed');
        }),
      };
      mockJsPDF.mockReturnValue(mockPdfInstance);

      await expect(exportResumeAsPDF(mockResumeData)).rejects.toThrow('PDF generation failed');
    });

    it('should handle empty resume data', async () => {
      const emptyResumeData: ResumeData = {
        personal: {
          name: '',
          title: '',
          location: '',
          email: '',
          website: '',
          summary: '',
        },
        experience: [],
        education: [],
        skills: {
          technical: [],
          soft: [],
        },
      };

      // Reset the mock to ensure clean state
      mockJsPDF.mockClear();
      const mockPdfInstance = {
        setFontSize: jest.fn().mockReturnThis(),
        setFont: jest.fn().mockReturnThis(),
        splitTextToSize: jest.fn().mockReturnValue(['test line']),
        text: jest.fn().mockReturnThis(),
        line: jest.fn().mockReturnThis(),
        setLineWidth: jest.fn().mockReturnThis(),
        addPage: jest.fn().mockReturnThis(),
        save: jest.fn().mockReturnThis(),
      };
      mockJsPDF.mockReturnValue(mockPdfInstance);

      await expect(exportResumeAsPDF(emptyResumeData)).resolves.not.toThrow();
    });
  });

  describe('exportResumeAsMarkdown', () => {
    it('should generate correct markdown format', () => {
      const markdown = exportResumeAsMarkdown(mockResumeData);

      expect(markdown).toContain('# John Doe');
      expect(markdown).toContain('## Software Engineer');
      expect(markdown).toContain('**Location:** San Francisco, CA');
      expect(markdown).toContain('**Email:** john@example.com');
      expect(markdown).toContain('**Website:** https://johndoe.com');
      expect(markdown).toContain('**Phone:** +1-555-0123');
    });

    it('should include experience section', () => {
      const markdown = exportResumeAsMarkdown(mockResumeData);

      expect(markdown).toContain('## Experience');
      expect(markdown).toContain('### Senior Software Engineer, Tech Corp');
      expect(markdown).toContain('**San Francisco, CA** | 2020 - Present');
      expect(markdown).toContain('- Built scalable microservices architecture');
      expect(markdown).toContain('**Key Skills:** React, Node.js, AWS, Docker');
    });

    it('should include education section', () => {
      const markdown = exportResumeAsMarkdown(mockResumeData);

      expect(markdown).toContain('## Education');
      expect(markdown).toContain('### Bachelor of Science in Computer Science');
      expect(markdown).toContain('**University of California**, Berkeley, CA | 2014 - 2018');
      expect(markdown).toContain('**GPA:** 3.8');
      expect(markdown).toContain('**Relevant Coursework:** Data Structures, Algorithms, Database Systems');
    });

    it('should include skills section', () => {
      const markdown = exportResumeAsMarkdown(mockResumeData);

      expect(markdown).toContain('## Skills');
      expect(markdown).toContain('### Technical Skills');
      expect(markdown).toContain('JavaScript, TypeScript, React, Node.js, Python');
      expect(markdown).toContain('### Soft Skills');
      expect(markdown).toContain('Leadership, Communication, Problem Solving');
      expect(markdown).toContain('### Languages');
      expect(markdown).toContain('English, Spanish');
    });

    it('should include certifications section', () => {
      const markdown = exportResumeAsMarkdown(mockResumeData);

      expect(markdown).toContain('## Certifications');
      expect(markdown).toContain('- **AWS Certified Solutions Architect**, Amazon Web Services (2021)');
      expect(markdown).toContain('- **Certified Kubernetes Administrator**, Cloud Native Computing Foundation (2022)');
    });

    it('should handle missing optional fields', () => {
      const minimalResumeData: ResumeData = {
        personal: {
          name: 'Jane Doe',
          title: 'Developer',
          location: 'NYC',
          email: 'jane@example.com',
          website: 'https://jane.com',
          summary: 'Developer',
        },
        experience: [],
        education: [],
        skills: {
          technical: ['JavaScript'],
          soft: ['Communication'],
        },
      };

      const markdown = exportResumeAsMarkdown(minimalResumeData);

      expect(markdown).toContain('# Jane Doe');
      expect(markdown).toContain('## Developer');
      expect(markdown).not.toContain('**Phone:**');
      expect(markdown).not.toContain('## Certifications');
    });
  });

  describe('exportResumeAsDOCX', () => {
    it('should create DOCX document', async () => {
      await exportResumeAsDOCX(mockResumeData, 'test-resume.docx');

      expect(mockDocument).toHaveBeenCalled();
      expect(mockPacker.toArrayBuffer).toHaveBeenCalled();
      expect(mockSaveAs).toHaveBeenCalled();
    });

    it('should use default filename when not provided', async () => {
      await exportResumeAsDOCX(mockResumeData);

      expect(mockSaveAs).toHaveBeenCalledWith(
        expect.any(Blob),
        'resume.docx'
      );
    });

    it('should handle errors gracefully', async () => {
      // Clear previous mock calls and set up error
      mockPacker.toArrayBuffer.mockClear();
      mockPacker.toArrayBuffer.mockRejectedValue(new Error('DOCX generation failed'));

      await expect(exportResumeAsDOCX(mockResumeData)).rejects.toThrow('DOCX generation failed');
    });

    it('should create proper document structure', async () => {
      // Reset the mock to ensure clean state
      mockPacker.toArrayBuffer.mockClear();
      mockPacker.toArrayBuffer.mockResolvedValue(new ArrayBuffer(8));

      await exportResumeAsDOCX(mockResumeData);

      expect(mockDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              children: expect.any(Array),
            }),
          ]),
        })
      );
    });
  });

  describe('downloadMarkdown', () => {
    beforeEach(() => {
      // Mock URL.createObjectURL and URL.revokeObjectURL
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = jest.fn();
    });

    it('should create and download markdown file', () => {
      const markdown = '# Test Resume\nThis is a test resume.';
      const filename = 'test-resume.md';

      downloadMarkdown(markdown, filename);

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(
        expect.any(Blob)
      );
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should use default filename when not provided', () => {
      const markdown = '# Test Resume\nThis is a test resume.';

      downloadMarkdown(markdown);

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(
        expect.any(Blob)
      );
    });

    it('should create blob with correct type', () => {
      const markdown = '# Test Resume\nThis is a test resume.';

      downloadMarkdown(markdown);

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'text/markdown',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle PDF generation errors', async () => {
      // Reset the mock to get a fresh instance
      mockJsPDF.mockClear();
      const mockPdfInstance = {
        setFontSize: jest.fn().mockReturnThis(),
        setFont: jest.fn().mockReturnThis(),
        splitTextToSize: jest.fn().mockReturnValue(['test line']),
        text: jest.fn().mockReturnThis(),
        line: jest.fn().mockReturnThis(),
        setLineWidth: jest.fn().mockReturnThis(),
        addPage: jest.fn().mockReturnThis(),
        save: jest.fn().mockImplementation(() => {
          throw new Error('PDF save failed');
        }),
      };
      mockJsPDF.mockReturnValue(mockPdfInstance);

      await expect(exportResumeAsPDF(mockResumeData)).rejects.toThrow('PDF save failed');
    });

    it('should handle DOCX generation errors', async () => {
      mockPacker.toArrayBuffer.mockRejectedValue(new Error('DOCX generation failed'));

      await expect(exportResumeAsDOCX(mockResumeData)).rejects.toThrow('DOCX generation failed');
    });

    it('should handle markdown download errors', () => {
      global.URL.createObjectURL = jest.fn(() => {
        throw new Error('URL creation failed');
      });

      expect(() => downloadMarkdown('test')).toThrow('URL creation failed');
    });
  });
});