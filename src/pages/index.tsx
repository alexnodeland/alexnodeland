import React from 'react';
import { SEO } from '../components';
import { getCTAButtonURL, homepageConfig } from '../config';
import { expertiseIcons } from '../components/expertise-icons';
import { useScrollSpy } from '../lib/hooks';
import '../styles/index.scss';

// The cover — the h1 and the subtitle links — is not here: the shell mounts
// once for the whole site and resolves its own hero from the path, so every
// hero lives in src/components/heroes.tsx. This page is what scrolls inside
// the window.
const IndexPage: React.FC = () => {
  // The grid used to sit lit up wherever a tap left it, on cards that go
  // nowhere when clicked. Reading position drives the highlight instead.
  const { containerRef: expertiseRef, isActive: isExpertiseActive } =
    useScrollSpy<HTMLDivElement>('.expertise-item');

  return (
    <>
      <SEO
        title={homepageConfig.hero.title}
        description="AI engineer and mathematician. Agent systems, distributed infrastructure, and audio DSP."
      />
      <div className="home">
        <section className="about">
          <div className="about-content">
            {homepageConfig.about.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section className="consulting">
          <h2>{homepageConfig.consulting.title}</h2>
          <p>{homepageConfig.consulting.description}</p>
          <div className="cta-buttons">
            <a
              href={getCTAButtonURL(
                homepageConfig.consulting.ctaButtons.primary.action,
                homepageConfig.consulting.ctaButtons.primary.url
              )}
              className="cta-button primary"
              target={
                homepageConfig.consulting.ctaButtons.primary.action ===
                'calendar'
                  ? '_blank'
                  : undefined
              }
              rel={
                homepageConfig.consulting.ctaButtons.primary.action ===
                'calendar'
                  ? 'noopener noreferrer'
                  : undefined
              }
            >
              {homepageConfig.consulting.ctaButtons.primary.text}
            </a>
            <a
              href={getCTAButtonURL(
                homepageConfig.consulting.ctaButtons.secondary.action,
                homepageConfig.consulting.ctaButtons.secondary.url
              )}
              className="cta-button secondary"
              target={
                homepageConfig.consulting.ctaButtons.secondary.action ===
                'calendar'
                  ? '_blank'
                  : undefined
              }
              rel={
                homepageConfig.consulting.ctaButtons.secondary.action ===
                'calendar'
                  ? 'noopener noreferrer'
                  : undefined
              }
            >
              {homepageConfig.consulting.ctaButtons.secondary.text}
            </a>
          </div>
        </section>

        <section className="expertise">
          <h2>{homepageConfig.expertise.title}</h2>
          <div className="expertise-grid" ref={expertiseRef}>
            {homepageConfig.expertise.items.map((item, index) => {
              // Drawn as a set, in config order. The icon is decorative — the
              // title sits directly beneath it and does the labelling — so the
              // svg is hidden from assistive tech rather than repeating it.
              const Icon = expertiseIcons[index];
              return (
                <div
                  key={index}
                  className={`expertise-item${
                    isExpertiseActive(index) ? ' is-active' : ''
                  }`}
                >
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

        <section className="blog-preview">
          <h2>writing</h2>
          <p>
            notes on things i&apos;ve built, plus press and research going back
            to 2015 — supercomputing, audio compression, and whatever i&apos;m
            currently taking apart. <a href="/blog">read the blog</a>.
          </p>
        </section>
      </div>
    </>
  );
};

export default IndexPage;
