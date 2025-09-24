import React from 'react';
import {
  Layout,
  SEO,
  ExperienceSection,
  EducationSection,
  SkillsSection,
  ExportButtons,
} from '../components';
import { resumeData } from '../config';
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
          resumeData={resumeData}
          resumeElementId="resume-content"
          className="cv-export"
        />

        <div className="cv-overview-contact">
          <div className="overview-section">
            <h3>overview</h3>
            <p>{resumeData.personal.summary}</p>
          </div>
          <div className="contact-section">
            <h3>contact</h3>
            <div className="contact-grid">
              <div className="contact-item">
                <span className="contact-label">location</span>
                <span className="contact-value">
                  {resumeData.personal.location}
                </span>
              </div>
              <div className="contact-item">
                <span className="contact-label">email</span>
                <a
                  href={`mailto:${resumeData.personal.email}`}
                  className="contact-value"
                >
                  {resumeData.personal.email}
                </a>
              </div>
              <div className="contact-item">
                <span className="contact-label">website</span>
                <a
                  href={`https://${resumeData.personal.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-value"
                >
                  {resumeData.personal.website}
                </a>
              </div>
              {resumeData.personal.phone && (
                <div className="contact-item">
                  <span className="contact-label">phone</span>
                  <a
                    href={`tel:${resumeData.personal.phone}`}
                    className="contact-value"
                  >
                    {resumeData.personal.phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div id="resume-content">
          <div id="experience-section">
            <ExperienceSection experiences={resumeData.experience} />
          </div>

          <div id="education-section">
            <EducationSection education={resumeData.education} />
          </div>

          <div id="skills-section">
            <SkillsSection skills={resumeData.skills} />
          </div>

          {resumeData.certifications &&
            resumeData.certifications.length > 0 && (
              <section id="certifications-section" className="cv-section">
                <h2>certifications</h2>
                <ul className="certifications-list">
                  {resumeData.certifications.map((cert, index) => (
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
