import { Link } from 'gatsby';
import React from 'react';
import { Layout, SEO } from '../components';
import { getCTAButtonURL, homepageConfig } from '../config';
import { expertiseIcons } from '../components/expertise-icons';
import { useScrollSpy } from '../lib/hooks';
import '../styles/index.scss';

const IndexPage: React.FC = () => {
  // The grid used to sit lit up wherever a tap left it, on cards that go
  // nowhere when clicked. Reading position drives the highlight instead.
  const { containerRef: expertiseRef, isActive: isExpertiseActive } =
    useScrollSpy<HTMLDivElement>('.expertise-item');

  // The collapse choreography needs real widths: at full collapse the title
  // parks on the left edge and the subtitle on the right, each travelling
  // half of its leftover space, and the subtitle rises to the title's
  // centerline. CSS can't measure, so the shifts are published as pixel
  // custom properties and the stylesheet scales them by --hero-collapse.
  const heroRef = React.useRef<HTMLElement>(null);
  React.useLayoutEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const measure = () => {
      const h1 = el.querySelector('h1');
      const sub = el.querySelector<HTMLElement>('.hero-subtitle');
      if (!h1 || !sub) return;
      const w = el.clientWidth;
      el.style.setProperty('--title-shift', `${(w - h1.offsetWidth) / 2}px`);
      el.style.setProperty('--sub-shift', `${(w - sub.offsetWidth) / 2}px`);
      el.style.setProperty(
        '--row-lift',
        `${(h1.offsetHeight + sub.offsetHeight) / 2}px`
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The cover, on the bare field above the window. It collapses on scroll
  // like every other page hero: the subtitle gives its space back to the
  // window and returns when the reader scrolls back to the top.
  const hero = (
    <section className="hero" ref={heroRef}>
      <h1>{homepageConfig.hero.title}</h1>
      {/* The subtitle is also the map of the projects page: each segment
          links to its section anchor there. */}
      <p className="hero-subtitle">
        {homepageConfig.hero.subtitleLinks.map((link, index) => (
          <React.Fragment key={link.href}>
            {index > 0 && ' → '}
            <Link to={link.href} className="hero-subtitle-link">
              {link.label}
            </Link>
          </React.Fragment>
        ))}
      </p>
    </section>
  );

  return (
    <Layout hero={hero} collapsibleHero>
      <SEO
        title="home"
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
    </Layout>
  );
};

export default IndexPage;
