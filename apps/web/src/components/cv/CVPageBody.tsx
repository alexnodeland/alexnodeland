import { navigate } from 'gatsby';
import React, { useState } from 'react';
import { CVData, CVVariant } from '../../config/cv';
import { scrollBehavior } from '../../lib/utils/motion';
import CVControlBar from './CVControlBar';
import EducationSection from './CVEducationSection';
import ExperienceSection from './CVExperienceSection';
import CVProjectsSection from './CVProjectsSection';
import CVSearch from './CVSearch';
import SkillsSection from './CVSkillsSection';

interface CVPageBodyProps {
  data: CVData;
  /** Which document this is; picks the downloads the control row offers. */
  variant: CVVariant;
  /**
   * Given on /cv/, where one page switches between the full CV and the
   * one-pager in place. The role pages leave it out, and picking from their
   * menu navigates instead — see `goToDocument`.
   */
  onViewChange?: (view: CVVariant) => void;
}

/**
 * Everything the CV pages draw inside the window, for every variant.
 *
 * /cv/, /cv/fde/ and /cv/ai-engineer/ used to be two renderers: the CV page,
 * and a role-page component with a header of its own that matched nothing
 * above the experience section. Now there is one body and the pages differ
 * only in the data they hand it, so a change to how the CV is presented lands
 * on all three at once instead of drifting apart.
 *
 * The heroes ("alex → cv" and its tagline) are not here — the shell resolves
 * them from the path, in src/components/heroes.tsx.
 */
/**
 * Where a pick from a role page's document menu goes. The two lengths live on
 * /cv/ — the one-pager behind `?view=resume`, which the CV page reads on load —
 * and picking the page you are already on does nothing.
 */
const goToDocument = (current: CVVariant) => (next: CVVariant) => {
  if (next === current) return;
  if (next === 'full') navigate('/cv/');
  else if (next === 'resume') navigate('/cv/?view=resume');
  else if (next === 'fde') navigate('/cv/fde/');
  else if (next === 'ai-engineer') navigate('/cv/ai-engineer/');
};

const CVPageBody: React.FC<CVPageBodyProps> = ({
  data,
  variant,
  onViewChange,
}) => {
  // Phone only: whether the search panel is folded out. Desktop ignores it.
  const [searchOpen, setSearchOpen] = useState(false);

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
        opened.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' });
      });
    };
    root.addEventListener('toggle', onToggle, true);
    return () => root.removeEventListener('toggle', onToggle, true);
  }, [data]);

  return (
    <div className="cv" ref={cvRef}>
      <CVControlBar
        resumeData={data}
        view={variant}
        onViewChange={onViewChange ?? goToDocument(variant)}
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

        {/* Between experience and education, where every other export puts
            it — the PDF, the DOCX and the Markdown all set it there. */}
        {data.projects && data.projects.length > 0 && (
          <section id="cv-projects">
            <CVProjectsSection projects={data.projects} />
          </section>
        )}

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
  );
};

export default CVPageBody;
