import React from 'react';
import SEO from '../components/seo';
import { getCTAButtonURL, homepageConfig } from '../config';
import '../styles/index.scss';

/**
 * Consulting, on a page of its own.
 *
 * It used to be a section on the homepage, under the expertise grid and above
 * nothing. That put a "book a call" button in front of every hiring manager
 * who opened the site, which reads as someone whose attention is already
 * spoken for. Here the same copy is one link away for anyone who came looking
 * for it, and invisible to anyone who did not — the page is not in the nav.
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
        description="Consulting engagements — LLM systems that need to survive production, and second opinions before a team commits to building one."
        pathname={location?.pathname}
      />
      <div className="home">
        <section className="consulting">
          <p>{consulting.description}</p>
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
