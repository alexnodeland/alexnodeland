import React, { useEffect, useMemo, useRef, useState } from 'react';

interface CVSectionNavProps {
  sections: Array<{ id: string; label: string; mobileLabel?: string }>;
  className?: string;
}

const CVSectionNav: React.FC<CVSectionNavProps> = ({ sections, className }) => {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');
  const observerRef = useRef<IntersectionObserver | null>(null);

  const targets = useMemo(() => sections.map(s => s.id), [sections]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const headerHeight = getComputedStyle(document.documentElement)
      .getPropertyValue('--header-height')
      .trim();

    const rootMarginTop = (() => {
      // Fallback if CSS var is not parsable
      try {
        // Parse px value if present; otherwise default
        const parsed = parseFloat(headerHeight.replace('px', '')) || 0;
        return -(parsed + 24); // add spacing buffer
      } catch {
        return -96;
      }
    })();

    const opts = {
      root: null,
      // Using rootMargin top negative so a section counts active when reaching under header
      rootMargin: `${rootMarginTop}px 0px -60% 0px`,
      threshold: [0, 0.25, 0.5, 1],
    };

    observerRef.current = new IntersectionObserver(entries => {
      // Pick the entry most in view
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target?.id) {
        setActiveId(visible.target.id);
      }
    }, opts);

    const observer = observerRef.current;
    targets.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [targets]);

  const handleClick =
    (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent any bubbling issues

      const targetElement = document.getElementById(id);
      if (!targetElement) {
        console.error(`Cannot find element with id: ${id}`);
        // Fallback to hash navigation
        window.location.hash = id;
        return;
      }

      // Scroll to the target section

      // Use scrollIntoView with the scroll-margin-top handling the offset
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });

      // Update the URL hash without triggering a jump
      if (window.history.pushState) {
        window.history.pushState(null, '', `#${id}`);
      }
    };

  return (
    <nav
      className={`cv-section-nav${className ? ` ${className}` : ''}`}
      aria-label="CV sections"
    >
      <ul>
        {sections.map(({ id, label, mobileLabel }) => (
          <li key={id} className={activeId === id ? 'active' : undefined}>
            <a
              href={`#${id}`}
              onClick={handleClick(id)}
              role="button"
              tabIndex={0}
            >
              <span className="nav-label-desktop">{label}</span>
              <span className="nav-label-mobile">{mobileLabel || label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default CVSectionNav;
