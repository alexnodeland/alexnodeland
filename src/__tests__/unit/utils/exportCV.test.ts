// Mock the modules first
jest.mock('docx', () => ({
  Document: jest.fn(),
  Packer: {
    toArrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
  },
  Paragraph: jest.fn(),
  TextRun: jest.fn(),
  Table: jest.fn(),
  TableRow: jest.fn(),
  TableCell: jest.fn(),
  AlignmentType: { CENTER: 'center', RIGHT: 'right' },
  BorderStyle: { SINGLE: 'single', NONE: 'none' },
  TableLayoutType: { FIXED: 'fixed' },
  WidthType: { DXA: 'dxa' },
}));

jest.mock('file-saver', () => ({
  saveAs: jest.fn(),
}));

import {
  downloadMarkdown,
  exportCVAsDOCX,
  exportCVAsMarkdown,
} from '../../../lib/utils/export';
import { CVData } from '../../../types/cv';

// Get the mocked modules
const mockDocument = require('docx').Document;
const mockPacker = require('docx').Packer;
const mockSaveAs = require('file-saver').saveAs;

describe('exportCV Utility Functions', () => {
  const mockCVData: CVData = {
    personal: {
      name: 'John Doe',
      title: 'Software Engineer',
      location: 'San Francisco, CA',
      email: 'john@example.com',
      website: 'https://johndoe.com',
      phone: '+1-555-0123',
      summary:
        'Experienced software engineer with 5+ years of experience in full-stack development.',
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
        relevantCoursework: [
          'Data Structures',
          'Algorithms',
          'Database Systems',
        ],
        achievements: ['Magna Cum Laude', "Dean's List"],
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

  describe('exportCVAsMarkdown', () => {
    it('should generate correct markdown format', () => {
      const markdown = exportCVAsMarkdown(mockCVData);

      expect(markdown).toContain('# John Doe');
      expect(markdown).toContain('## Software Engineer');
      expect(markdown).toContain('**Location:** San Francisco, CA');
      expect(markdown).toContain('**Email:** john@example.com');
      expect(markdown).toContain('**Website:** https://johndoe.com');
      expect(markdown).toContain('**Phone:** +1-555-0123');
    });

    it('should include experience section', () => {
      const markdown = exportCVAsMarkdown(mockCVData);

      expect(markdown).toContain('## Experience');
      expect(markdown).toContain('### Senior Software Engineer, Tech Corp');
      expect(markdown).toContain('**San Francisco, CA** | 2020 - Present');
      expect(markdown).toContain('- Built scalable microservices architecture');
      expect(markdown).toContain('**Key Skills:** React, Node.js, AWS, Docker');
    });

    it('should include education section', () => {
      const markdown = exportCVAsMarkdown(mockCVData);

      expect(markdown).toContain('## Education');
      expect(markdown).toContain('### Bachelor of Science in Computer Science');
      expect(markdown).toContain(
        '**University of California**, Berkeley, CA | 2014 - 2018'
      );
      expect(markdown).toContain('**GPA:** 3.8');
      expect(markdown).toContain(
        '**Relevant Coursework:** Data Structures, Algorithms, Database Systems'
      );
    });

    it('should include skills section', () => {
      const markdown = exportCVAsMarkdown(mockCVData);

      expect(markdown).toContain('## Skills');
      expect(markdown).toContain('### Technical Skills');
      expect(markdown).toContain(
        'JavaScript, TypeScript, React, Node.js, Python'
      );
      expect(markdown).toContain('### Soft Skills');
      expect(markdown).toContain('Leadership, Communication, Problem Solving');
      expect(markdown).toContain('### Languages');
      expect(markdown).toContain('English, Spanish');
    });

    it('should include certifications section', () => {
      const markdown = exportCVAsMarkdown(mockCVData);

      expect(markdown).toContain('## Certifications');
      expect(markdown).toContain(
        '- **AWS Certified Solutions Architect**, Amazon Web Services (2021)'
      );
      expect(markdown).toContain(
        '- **Certified Kubernetes Administrator**, Cloud Native Computing Foundation (2022)'
      );
    });

    it('should handle missing optional fields', () => {
      const minimalCVData: CVData = {
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
        certifications: [],
      };

      const markdown = exportCVAsMarkdown(minimalCVData);

      expect(markdown).toContain('# Jane Doe');
      expect(markdown).toContain('## Developer');
      expect(markdown).not.toContain('**Phone:**');
      expect(markdown).not.toContain('## Certifications');
    });
  });

  describe('exportCVAsDOCX', () => {
    it('should create DOCX document', async () => {
      await exportCVAsDOCX(mockCVData, 'test-resume.docx');

      expect(mockDocument).toHaveBeenCalled();
      expect(mockPacker.toArrayBuffer).toHaveBeenCalled();
      expect(mockSaveAs).toHaveBeenCalled();
    });

    it('should use default filename when not provided', async () => {
      await exportCVAsDOCX(mockCVData);

      expect(mockSaveAs).toHaveBeenCalledWith(expect.any(Blob), 'resume.docx');
    });

    it('should handle errors gracefully', async () => {
      // Clear previous mock calls and set up error
      mockPacker.toArrayBuffer.mockClear();
      mockPacker.toArrayBuffer.mockRejectedValue(
        new Error('DOCX generation failed')
      );

      await expect(exportCVAsDOCX(mockCVData)).rejects.toThrow(
        'DOCX generation failed'
      );
    });

    it('should create proper document structure', async () => {
      // Reset the mock to ensure clean state
      mockPacker.toArrayBuffer.mockClear();
      mockPacker.toArrayBuffer.mockResolvedValue(new ArrayBuffer(8));

      await exportCVAsDOCX(mockCVData);

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

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should use default filename when not provided', () => {
      const markdown = '# Test Resume\nThis is a test resume.';

      downloadMarkdown(markdown);

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
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
    it('should handle DOCX generation errors', async () => {
      mockPacker.toArrayBuffer.mockRejectedValue(
        new Error('DOCX generation failed')
      );

      await expect(exportCVAsDOCX(mockCVData)).rejects.toThrow(
        'DOCX generation failed'
      );
    });

    it('should handle markdown download errors', () => {
      global.URL.createObjectURL = jest.fn(() => {
        throw new Error('URL creation failed');
      });

      expect(() => downloadMarkdown('test')).toThrow('URL creation failed');
    });
  });
});
