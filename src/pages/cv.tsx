import React, { useState } from 'react';
import CVControlBar from '../components/cv/CVControlBar';
import EducationSection from '../components/cv/CVEducationSection';
import ExperienceSection from '../components/cv/CVExperienceSection';
import CVSearch from '../components/cv/CVSearch';
import SkillsSection from '../components/cv/CVSkillsSection';
import SEO from '../components/seo';
import { cvData, resumeData } from '../config';
import '../styles/cv.scss';

type CVView = 'full' | 'resume';

const CVPage: React.FC<{ location?: { pathname?: string } }> = ({
  location,
}) => {
  const [view, setView] = useState<CVView>('full');
  // Phone only: whether the search panel is folded out. Desktop ignores it.
  const [searchOpen, setSearchOpen] = useState(false);
  const data = view === 'resume' ? resumeData : cvData;

  // One card open at a time. Opening a card closes whichever other card is
  // open, and — because a closing card above the new one pulls the page up —
  // the opened card is then scrolled back into position under the floating
  // controls. `toggle` does not bubble, so the listener captures.
  const cvRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const root = cvRef.current;
    if (!root) return;
    const onToggle = (event: Event) => {
      const opened = event.target as HTMLDetailsElement;
      if (!opened?.classList?.contains('cv-collapse') || !opened.open) return;
      root
        .querySelectorAll<HTMLDetailsElement>('details.cv-collapse[open]')
        .forEach(other => {
          if (other !== opened) other.open = false;
        });
      window.requestAnimationFrame(() => {
        const reduce = window.matchMedia(
          '(prefers-reduced-motion: reduce)'
        ).matches;
        opened.scrollIntoView({
          behavior: reduce ? 'auto' : 'smooth',
          block: 'nearest',
        });
      });
    };
    root.addEventListener('toggle', onToggle, true);
    return () => root.removeEventListener('toggle', onToggle, true);
  }, [view]);

  return (
    <>
      <SEO
        title="cv"
        description="Complete resume and CV for Alex Nodeland"
        pathname={location?.pathname}
      />
      <div className="cv" ref={cvRef}>
        <CVControlBar
          resumeData={data}
          view={view}
          onViewChange={setView}
          searchOpen={searchOpen}
          onToggleSearch={() => setSearchOpen(open => !open)}
        />

        <CVSearch resumeData={data} open={searchOpen} />

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
            <section id="cv-certifications" className="certifications-section">
              <h2 className="cv-section-title">Certifications</h2>
              {/* Cards, not chips. The chips carried a regex-shortened name
                  and hid everything else — issuer, date, credential — inside a
                  hover tooltip that clipped the last entry in the row. Every
                  certification now states itself, in the same card grammar the
                  experience and education entries use: the name, and one
                  meta band at the foot with the issuer at one end and the
                  date at the other. */}
              <div className="certifications-grid">
                {data.certifications.map((cert, index) => (
                  <article key={index} className="cv-card certification-card">
                    <div className="cert-header">
                      <h3 className="cert-name">{cert.name}</h3>
                    </div>
                    <div className="cert-meta">
                      <span className="cert-issuer">{cert.issuer}</span>
                      <span className="cert-date">{cert.date}</span>
                    </div>
                    {cert.credentialId && (
                      <p className="cert-credential">id: {cert.credentialId}</p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
};

export default CVPage;
