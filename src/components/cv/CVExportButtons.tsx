import React, { useState } from 'react';
import { CVData } from '../../config/cv';
import {
  CVVariant,
  downloadMarkdown,
  exportCVAsDOCX,
  exportCVAsMarkdown,
} from '../../lib/utils/export';

// The PDFs are typeset by LaTeX at build time rather than generated in the
// browser — see scripts/build-cv.js — so the PDF button is a plain download
// link at the artifact for whichever length is on screen.
const PDF_ARTIFACTS: Record<CVVariant, string> = {
  resume: '/cv/alex-nodeland-resume.pdf',
  full: '/cv/alex-nodeland-cv.pdf',
};

interface CVExportButtonsProps {
  resumeData: CVData;
  resumeElementId: string;
  /** Which length is on screen; picks the artifact and the DOCX layout. */
  variant?: CVVariant;
  className?: string;
}

const CVExportButtons: React.FC<CVExportButtonsProps> = ({
  resumeData,
  resumeElementId: _resumeElementId,
  variant = 'full',
  className = '',
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{
      id: string;
      type: 'experience' | 'education' | 'skill' | 'certification';
      title: string;
      company?: string;
      institution?: string;
      description: string;
    }>
  >([]);
  const [showResults, setShowResults] = useState(false);

  // Search functionality
  const searchResume = (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const results: Array<{
      id: string;
      type: 'experience' | 'education' | 'skill' | 'certification';
      title: string;
      company?: string;
      institution?: string;
      description: string;
    }> = [];

    const searchLower = term.toLowerCase();

    // Search experiences
    resumeData.experience.forEach((exp, index) => {
      const searchableText =
        `${exp.title} ${exp.company} ${exp.achievements.join(' ')} ${exp.skills?.join(' ') || ''}`.toLowerCase();
      if (searchableText.includes(searchLower)) {
        results.push({
          id: `experience-${index}`,
          type: 'experience',
          title: exp.title,
          company: exp.company,
          description: exp.achievements[0] || exp.description || '',
        });
      }
    });

    // Search education
    resumeData.education.forEach((edu, index) => {
      const searchableText =
        `${edu.degree} ${edu.institution} ${edu.relevantCoursework?.join(' ') || ''} ${edu.achievements?.join(' ') || ''}`.toLowerCase();
      if (searchableText.includes(searchLower)) {
        results.push({
          id: `education-${index}`,
          type: 'education',
          title: edu.degree,
          institution: edu.institution,
          description: edu.description || edu.achievements?.[0] || '',
        });
      }
    });

    // Search skills
    const allSkills = [
      ...resumeData.skills.technical,
      ...resumeData.skills.soft,
      ...(resumeData.skills.languages || []),
    ];
    allSkills.forEach((skill, index) => {
      if (skill.toLowerCase().includes(searchLower)) {
        results.push({
          id: `skill-${index}`,
          type: 'skill',
          title: skill,
          description: 'Technical skill',
        });
      }
    });

    // Search certifications
    resumeData.certifications?.forEach((cert, index) => {
      const searchableText = `${cert.name} ${cert.issuer}`.toLowerCase();
      if (searchableText.includes(searchLower)) {
        results.push({
          id: `certification-${index}`,
          type: 'certification',
          title: cert.name,
          institution: cert.issuer,
          description: cert.date,
        });
      }
    });

    setSearchResults(results);
    setShowResults(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    searchResume(value);
  };

  const scrollToSection = (id: string) => {
    // Map search result IDs to actual section IDs
    const sectionMap: { [key: string]: string } = {
      experience: 'experience-section',
      education: 'education-section',
      skill: 'skills-section',
      certification: 'certifications-section',
    };

    const sectionId = sectionMap[id.split('-')[0]] || id;
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setShowResults(false);
      setSearchTerm('');
    }
  };

  const handleDOCXExport = async () => {
    setIsExporting(true);
    try {
      // DOCX export initiated
      await exportCVAsDOCX(
        resumeData,
        `${resumeData.personal.name.replace(/\s+/g, '_')}_Resume.docx`,
        variant
      );
    } catch (error) {
      console.error('DOCX export failed:', error);
      alert(
        `Failed to export DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleMarkdownExport = () => {
    try {
      const markdown = exportCVAsMarkdown(resumeData);
      downloadMarkdown(
        markdown,
        `${resumeData.personal.name.replace(/\s+/g, '_')}_Resume.md`
      );
    } catch (error) {
      console.error('Markdown export failed:', error);
      alert('Failed to export Markdown. Please try again.');
    }
  };

  return (
    <div className={`export-buttons ${className}`}>
      <div className="search-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="search experiences, education, skills..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>

        {showResults && searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map(result => (
              <div
                key={result.id}
                className="search-result-item"
                onClick={() => scrollToSection(result.id)}
              >
                <div className="result-type">{result.type}</div>
                <div className="result-title">{result.title}</div>
                {result.company && (
                  <div className="result-company">{result.company}</div>
                )}
                {result.institution && (
                  <div className="result-institution">{result.institution}</div>
                )}
                <div className="result-description">{result.description}</div>
              </div>
            ))}
          </div>
        )}

        {showResults && searchResults.length === 0 && searchTerm && (
          <div className="search-results">
            <div className="no-results">
              no results found for &quot;{searchTerm}&quot;
            </div>
          </div>
        )}
      </div>

      <div className="export-actions">
        <a href={PDF_ARTIFACTS[variant]} download className="export-button pdf">
          📄 download pdf
        </a>
        <button
          onClick={handleDOCXExport}
          disabled={isExporting}
          className="export-button docx"
        >
          {isExporting ? 'generating...' : '📝 download docx'}
        </button>
        <button
          onClick={handleMarkdownExport}
          className="export-button markdown"
        >
          📝 download markdown
        </button>
      </div>
    </div>
  );
};

export default CVExportButtons;
