import React from 'react';
import { Layout, SEO } from '../components';
import { getCTAButtonURL, homepageConfig } from '../config';
import developmentIcon from '../images/development.png';
import gearIcon from '../images/gear.png';
import observabilityIcon from '../images/observability.png';
import reportIcon from '../images/report.png';
import strategyIcon from '../images/strategy.png';
import systemsIcon from '../images/systems.png';
import '../styles/index.scss';

const IndexPage: React.FC = () => {
  return (
    <Layout>
      <SEO
        title="home"
        description="AI engineer and mathematician. Agent systems, distributed infrastructure, and audio DSP."
      />
      <div className="home">
        <section className="hero">
          <h1>{homepageConfig.hero.title}</h1>
          <p className="hero-subtitle">{homepageConfig.hero.subtitle}</p>
        </section>

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
          <div className="expertise-grid">
            {homepageConfig.expertise.items.map((item, index) => {
              const expertiseImages = [
                systemsIcon, // ai system architecture
                gearIcon, // devops & infrastructure
                reportIcon, // data engineering
                observabilityIcon, // mlops & monitoring
                strategyIcon, // technical leadership
                developmentIcon, // ai product development
              ];
              const iconSrc = expertiseImages[index] ?? developmentIcon;
              return (
                <div key={index} className="expertise-item">
                  <span className="expertise-icon">
                    <img src={iconSrc} alt={item.title} />
                  </span>
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
    </Layout>
  );
};

export default IndexPage;
