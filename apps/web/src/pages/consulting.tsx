import React from 'react';
import { consultingStepIcons } from '../components/consulting-icons';
import SEO from '../components/seo';
import { getCTAButtonURL, homepageConfig } from '../config';
import '../styles/index.scss';
import '../styles/consulting.scss';

/**
 * Consulting, on a page of its own.
 *
 * It used to be a section on the homepage: one paragraph and a "book a call"
 * button in the middle of the front page. The homepage
 * now spends one sentence on it, and this page — not in the nav — carries the
 * rest as a track record: what the engagements were and how one runs, with
 * only the last line and the buttons saying new ones are still possible.
 *
 * No client is named anywhere on it. The case studies describe who the work
 * was for, and that is deliberate, not a placeholder.
 */
const ConsultingPage: React.FC<{ location?: { pathname?: string } }> = ({
  location,
}) => {
  const { consulting } = homepageConfig;
  const { primary, secondary } = consulting.ctaButtons;

  // Only the calendar link leaves the site; mailto: stays in the client.
  const externalProps = (action: string) =>
    action === 'calendar'
      ? { target: '_blank', rel: 'noopener noreferrer' }
      : {};

  return (
    <>
      <SEO
        title="consulting"
        description="Past consulting work: LLM systems built to survive production, evaluations of whether and how to use LLMs, and engineering process."
        pathname={location?.pathname}
      />
      <div className="home">
        <section className="consulting">
          <p>{consulting.description}</p>
        </section>

        <section
          className="consulting-section"
          aria-labelledby="consulting-steps"
        >
          <h2 id="consulting-steps">how an engagement runs</h2>
          <ol className="consulting-steps">
            {consulting.steps.map((step, index) => {
              // Paired by position with the steps (see consulting-icons). The
              // drawing is decorative: the title under it does the naming.
              const Icon = consultingStepIcons[index];
              return (
                <li key={step.title} className="consulting-step">
                  <div className="consulting-step-head">
                    <span className="consulting-step-icon">
                      {Icon && <Icon />}
                    </span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </li>
              );
            })}
          </ol>
        </section>

        <section
          className="consulting-section"
          aria-labelledby="consulting-work"
        >
          <h2 id="consulting-work">past work</h2>
          <div className="consulting-work">
            {consulting.caseStudies.map(study => (
              <article key={study.title} className="consulting-case">
                <h3>{study.title}</h3>
                <p>{study.body}</p>
                <div className="consulting-case-client">{study.client}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="consulting">
          <p>{consulting.closing}</p>
          <div className="cta-buttons">
            <a
              href={getCTAButtonURL(primary.action, primary.url)}
              className="cta-button primary"
              {...externalProps(primary.action)}
            >
              {primary.text}
            </a>
            <a
              href={getCTAButtonURL(secondary.action, secondary.url)}
              className="cta-button secondary"
              {...externalProps(secondary.action)}
            >
              {secondary.text}
            </a>
          </div>
        </section>
      </div>
    </>
  );
};

export default ConsultingPage;
