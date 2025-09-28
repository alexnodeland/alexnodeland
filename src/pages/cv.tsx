import React from 'react';
import {
  EducationSection,
  ExperienceSection,
  ExportButtons,
  Layout,
  SEO,
  SkillsSection,
} from '../components';
import { cvData } from '../config';
import '../styles/cv.scss';

const CVPage: React.FC = () => {
  return (
    <Layout>
      <SEO title="cv" description="Complete resume and CV for Alex Nodeland" />
      <div className="cv">
        <header className="cv-page-header">
          <h1>cv</h1>
          <p>
            comprehensive overview of my professional experience, skills, and
            achievements
          </p>
        </header>

        <ExportButtons
          resumeData={cvData}
          resumeElementId="resume-content"
          className="cv-export"
        />

        <div className="cv-overview-contact">
          <div className="overview-section">
            <h3>overview</h3>
            <p>{cvData.personal.summary}</p>
          </div>
          <div className="contact-section">
            <h3>contact</h3>
            <div className="contact-grid">
              <div className="contact-item">
                <span className="contact-label">location</span>
                <span className="contact-value">
                  {cvData.personal.location}
                </span>
              </div>
              <div className="contact-item">
                <span className="contact-label">email</span>
                <a
                  href={`mailto:${cvData.personal.email}`}
                  className="contact-value"
                >
                  {cvData.personal.email}
                </a>
              </div>
              <div className="contact-item">
                <span className="contact-label">website</span>
                <a
                  href={`https://${cvData.personal.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-value"
                >
                  {cvData.personal.website}
                </a>
              </div>
              {cvData.personal.phone && (
                <div className="contact-item">
                  <span className="contact-label">phone</span>
                  <a
                    href={`tel:${cvData.personal.phone}`}
                    className="contact-value"
                  >
                    {cvData.personal.phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div id="resume-content">
          <ExperienceSection experiences={cvData.experience} />

          <EducationSection education={cvData.education} />

          <SkillsSection skills={cvData.skills} />

          {cvData.certifications && cvData.certifications.length > 0 && (
            <>
              <h2 className="cv-section-title">Certifications</h2>
              <div className="certifications-container">
                {cvData.certifications.map((cert, index) => {
                  // Create a shorter name for the chip - be more careful with word boundaries
                  let shortName = cert.name
                    // Remove common certification words only when they're complete words
                    .replace(
                      /\b(Certified|Certificate|Professional|Developer|Engineer|Specialist|Administrator|Associate|Training|Program|Course)\b/gi,
                      ''
                    )
                    // Remove common prepositions and articles
                    .replace(/\b(in|of|for|the|a|an|and)\b/gi, '')
                    // Clean up multiple spaces
                    .replace(/\s+/g, ' ')
                    .trim();

                  // If the result is too short or empty, use a better fallback
                  if (!shortName || shortName.length < 3) {
                    // Try to get the first meaningful words or acronym
                    const words = cert.name
                      .split(' ')
                      .filter(word => word.length > 2);
                    shortName = words.slice(0, 3).join(' ');
                  }

                  // If still too long, truncate intelligently
                  if (shortName.length > 25) {
                    shortName = shortName.substring(0, 22) + '...';
                  }

                  return (
                    <div key={index} className="certification-chip">
                      <span className="cert-name">{shortName}</span>
                      <div className="cert-tooltip">
                        <div className="tooltip-content">
                          <strong>{cert.name}</strong>
                          <div className="cert-issuer">{cert.issuer}</div>
                          <div className="cert-date">{cert.date}</div>
                          {cert.credentialId && (
                            <div className="cert-credential">
                              ID: {cert.credentialId}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CVPage;
