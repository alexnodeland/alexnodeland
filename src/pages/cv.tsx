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
          <div id="experience-section">
            <ExperienceSection experiences={cvData.experience} />
          </div>

          <div id="education-section">
            <EducationSection education={cvData.education} />
          </div>

          <div id="skills-section">
            <SkillsSection skills={cvData.skills} />
          </div>

          {cvData.certifications && cvData.certifications.length > 0 && (
            <section id="certifications-section" className="cv-section">
              <h2>certifications</h2>
              <ul className="certifications-list">
                {cvData.certifications.map((cert, index) => (
                  <li key={index}>
                    <strong>{cert.name}</strong>, {cert.issuer}, {cert.date}
                    {cert.credentialId && ` (${cert.credentialId})`}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CVPage;
