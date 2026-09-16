import { Link } from 'gatsby';
import React from 'react';
import SEO from '../components/seo';
import { getPersonSchema, homepageConfig } from '../config';
import { expertiseIcons } from '../components/expertise-icons';
import '../styles/index.scss';

// The cover — the h1 and the subtitle links — is not here: the shell mounts
// once for the whole site and resolves its own hero from the path, so every
// hero lives in src/components/heroes.tsx. This page is what scrolls inside
// the window.
// `location` is what Gatsby hands every page; optional so the page can still
// be rendered bare (tests do).
const IndexPage: React.FC<{ location?: { pathname?: string } }> = ({
  location,
}) => {
  // The expertise grid is static (see .expertise-item in index.scss): no
  // hover, no reading-line highlight. A scroll spy used to run here for a
  // highlight the stylesheet had already dropped — six layout reads on every
  // scroll frame, on the page with the hero collapse — so it is gone too.

  return (
    <>
      <SEO
        title={homepageConfig.hero.title}
        description="AI engineer and mathematician. Agent systems, distributed infrastructure, and audio DSP."
        pathname={location?.pathname}
        jsonLd={getPersonSchema()}
      />
      <div className="home">
        <section className="about">
          <div className="about-content">
            {homepageConfig.about.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
            {/* The whole of consulting on the front page: one sentence and a
                link. The section it replaced lives at /consulting/. */}
            <p className="about-consulting-note">
              {homepageConfig.about.consultingNote.before}{' '}
              <Link to={homepageConfig.about.consultingNote.href}>
                {homepageConfig.about.consultingNote.linkText}
              </Link>{' '}
              {homepageConfig.about.consultingNote.after}
            </p>
          </div>
        </section>

        <section className="expertise">
          <h2>{homepageConfig.expertise.title}</h2>
          <div className="expertise-grid">
            {homepageConfig.expertise.items.map((item, index) => {
              // Drawn as a set, in config order. The icon is decorative — the
              // title sits directly beneath it and does the labelling — so the
              // svg is hidden from assistive tech rather than repeating it.
              const Icon = expertiseIcons[index];
              return (
                <div key={index} className="expertise-item">
                  <span className="expertise-icon">{Icon && <Icon />}</span>
                  <div className="expertise-title">{item.title}</div>
                  <div className="expertise-description">
                    {item.description}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
};

export default IndexPage;
