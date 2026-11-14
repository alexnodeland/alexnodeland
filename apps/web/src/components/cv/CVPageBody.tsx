import { navigate } from 'gatsby';
import React from 'react';
import { CVData, CVVariant, CV_PAGES, isRoleVariant } from '../../config/cv';
import { scrollBehavior } from '../../lib/utils/motion';
import CVControlBar from './CVControlBar';
import EducationSection from './CVEducationSection';
import ExperienceSection from './CVExperienceSection';
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
 * Where a pick from a role page's document menu goes. The two lengths live on
 * /cv/ — the one-pager behind `?view=resume`, which the CV page reads on load —
 * and every role variant at its own page's path, from src/config/cv-pages.json.
 * Picking the page you are already on does nothing.
 */
const goToDocument = (current: CVVariant) => (next: CVVariant) => {
  if (next === current) return;
  if (next === 'full') navigate('/cv/');
  else if (next === 'resume') navigate('/cv/?view=resume');
  else if (isRoleVariant(next)) navigate(CV_PAGES[next].path);
};

/**
 * Everything the CV pages draw inside the window, for every variant.
 *
 * /cv/ and every role-variant page used to be two renderers: the CV page, and
 * a role-page component with a header of its own that matched nothing above
 * the experience section. Now there is one body — the role pages are generated
 * from src/templates/cv-variant.tsx — and the pages differ only in the data
 * they hand it, so a change to how the CV is presented lands
 * on all three at once instead of drifting apart.
 *
 * The heroes ("alex → cv" and its tagline) are not here — the shell resolves
 * them from the path, in src/components/heroes.tsx.
 */
const CVPageBody: React.FC<CVPageBodyProps> = ({
  data,
  variant,
  onViewChange,
}) => {
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
      />

      <div className="cv-overview-contact">
        {/* Second-level headings, like "Experience" and the sections after
            it: these two are sections of the page, not of anything above
            them, and an h3 here put a third level directly under the page's
            title. Their size is the card's own (see .cv-overview-contact). */}
        <div className="overview-section">
          <h2>overview</h2>
          <p>{data.personal.summary}</p>
        </div>
        {/* The contact details, as one line of them under the summary — a
            resume's own header line. Each says what it is by its shape (an
            address, a domain, a profile), so the labels are for a screen
            reader only. They used to be a column of label-over-value pairs
            beside the summary: ten lines on a phone for five facts. */}
        <div className="contact-section">
          <h2 className="sr-only">contact</h2>
          <ul className="contact-list">
            <li>
              <span className="sr-only">location: </span>
              {data.personal.location}
            </li>
            <li>
              <span className="sr-only">email: </span>
              <a href={`mailto:${data.personal.email}`}>
                {data.personal.email}
              </a>
            </li>
            <li>
              <span className="sr-only">website: </span>
              <a
                href={`https://${data.personal.website}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {data.personal.website}
              </a>
            </li>
            {data.personal.linkedin && (
              <li>
                <span className="sr-only">linkedin: </span>
                <a
                  href={`https://${data.personal.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {data.personal.linkedin}
                </a>
              </li>
            )}
            {data.personal.github && (
              <li>
                <span className="sr-only">github: </span>
                <a
                  href={`https://${data.personal.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {data.personal.github}
                </a>
              </li>
            )}
            {data.personal.phone && (
              <li>
                <span className="sr-only">phone: </span>
                <a href={`tel:${data.personal.phone}`}>{data.personal.phone}</a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div id="resume-content">
        <section id="cv-experience">
          <ExperienceSection experiences={data.experience} />
        </section>

        {/* No projects section here. The PDF, DOCX and Markdown exports set
            one between experience and education; on the site the projects
            page is a click away and says more than a card could. */}

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
