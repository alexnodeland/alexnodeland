import { Link } from 'gatsby';
import React, { useState } from 'react';
import {
  CVControlBar,
  CVSearch,
  EducationSection,
  ExperienceSection,
  Layout,
  SEO,
  SkillsSection,
} from '../components';
import { cvData, resumeData } from '../config';
import '../styles/cv.scss';

type CVView = 'full' | 'resume';

const CVPage: React.FC = () => {
  const [view, setView] = useState<CVView>('full');
  const data = view === 'resume' ? resumeData : cvData;

  const hero = (
    <header className="cv-page-header">
      <h1>
        <Link to="/" className="hero-crumb" data-brand-anchor>
          alex
        </Link>
        <span className="hero-crumb-sep"> → </span>cv
      </h1>
      <p>everything, in order, back to 2010.</p>
    </header>
  );

  return (
    <Layout hero={hero} collapsibleHero>
      <SEO title="cv" description="Complete resume and CV for Alex Nodeland" />
      <div className="cv">
        <CVControlBar resumeData={data} view={view} onViewChange={setView} />

        <CVSearch resumeData={data} />

        <div className="cv-overview-contact">
          <div className="overview-section">
            <h3>overview</h3>
            <p>{data.personal.summary}</p>
          </div>
          <div className="contact-section">
            <h3>contact</h3>
            <div className="contact-grid">
              <div className="contact-item">
                <span className="contact-label">location</span>
                <span className="contact-value">{data.personal.location}</span>
              </div>
              <div className="contact-item">
                <span className="contact-label">email</span>
                <a
                  href={`mailto:${data.personal.email}`}
                  className="contact-value"
                >
                  {data.personal.email}
                </a>
              </div>
              <div className="contact-item">
                <span className="contact-label">website</span>
                <a
                  href={`https://${data.personal.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-value"
                >
                  {data.personal.website}
                </a>
              </div>
              {data.personal.phone && (
                <div className="contact-item">
                  <span className="contact-label">phone</span>
                  <a
                    href={`tel:${data.personal.phone}`}
                    className="contact-value"
                  >
                    {data.personal.phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div id="resume-content">
          <section id="cv-experience">
            <ExperienceSection experiences={data.experience} />
          </section>

          <section id="cv-education">
            <EducationSection education={data.education} />
          </section>

          <section id="cv-skills">
            <SkillsSection skills={data.skills} />
          </section>

          {data.certifications && data.certifications.length > 0 && (
            <section id="cv-certifications">
              <h2 className="cv-section-title">Certifications</h2>
              <div className="certifications-container">
                {data.certifications.map((cert, index) => {
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
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CVPage;
