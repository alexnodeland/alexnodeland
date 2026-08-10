import React, { useState } from 'react';
import { CVData } from '../../config/cv';

type CVSearchResultType =
  | 'experience'
  | 'education'
  | 'skill'
  | 'certification';

interface CVSearchResult {
  id: string;
  type: CVSearchResultType;
  title: string;
  company?: string;
  institution?: string;
  description: string;
}

// The ids the CV page actually puts on its sections. The old panel mapped
// onto `experience-section` and friends, which no element on the page has
// ever carried — clicking a result scrolled nowhere.
const SECTION_IDS: Record<CVSearchResultType, string> = {
  experience: 'cv-experience',
  education: 'cv-education',
  skill: 'cv-skills',
  certification: 'cv-certifications',
};

export const searchCV = (
  resumeData: CVData,
  term: string
): CVSearchResult[] => {
  const searchLower = term.trim().toLowerCase();
  if (!searchLower) return [];

  const results: CVSearchResult[] = [];

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

  const allSkills = [...resumeData.skills.technical, ...resumeData.skills.soft];
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

  return results;
};

interface CVSearchProps {
  resumeData: CVData;
  className?: string;
}

/**
 * The CV's find-in-document field, in its own panel below the control row.
 * The row is chrome — two dropdowns, compact and sticky; this is somewhere to
 * type, with a result list long enough that it belongs in the flow of the page
 * rather than hanging over it.
 */
const CVSearch: React.FC<CVSearchProps> = ({ resumeData, className = '' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<CVSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
    const results = searchCV(resumeData, value);
    setSearchResults(results);
    setShowResults(Boolean(value.trim()));
  };

  const scrollToSection = (id: string) => {
    const type = id.split('-')[0] as CVSearchResultType;
    const element = document.getElementById(SECTION_IDS[type] || id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setShowResults(false);
      setSearchTerm('');
      setSearchResults([]);
    }
  };

  return (
    <div className={`cv-search-panel ${className}`.trim()}>
      <input
        type="text"
        placeholder="search experiences, education, skills..."
        aria-label="Search the CV"
        value={searchTerm}
        onChange={handleSearchChange}
        onKeyDown={event => {
          // Escape puts the list away without clearing what was typed, the
          // same key that closes the two menus in the row above.
          if (event.key === 'Escape' && showResults) {
            event.preventDefault();
            setShowResults(false);
          }
        }}
        className="search-input"
      />

      {showResults && searchResults.length > 0 && (
        <div className="search-results">
          {searchResults.map(result => (
            <div
              key={result.id}
              className="search-result-item"
              role="button"
              tabIndex={0}
              onClick={() => scrollToSection(result.id)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  scrollToSection(result.id);
                }
              }}
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
  );
};

export default CVSearch;
