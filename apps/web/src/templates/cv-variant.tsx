import React, { useMemo } from 'react';
import CVPageBody from '../components/cv/CVPageBody';
import SEO from '../components/seo';
import { buildVariant, CV_PAGES, RoleVariant } from '../config/cv';
import '../styles/cv.scss';

interface CVVariantTemplateProps {
  pageContext: { variant: RoleVariant };
  location?: { pathname?: string };
}

/**
 * The page for one role variant, created by `gatsby-node.js` once for every
 * entry in `src/config/cv-pages.json`.
 *
 * Unlisted: not in the nav, not linked from /cv/, not in the sitemap, and
 * `noindex`, so each one is an address to share beside its PDF. The body is
 * the /cv/ page's own, so the pages cannot drift apart; the hero ("alex → cv",
 * with the entry's tagline) is generated from the same entry in heroes.tsx.
 */
const CVVariantTemplate: React.FC<CVVariantTemplateProps> = ({
  pageContext,
  location,
}) => {
  const { variant } = pageContext;
  const page = CV_PAGES[variant];
  const data = useMemo(() => buildVariant(variant), [variant]);

  return (
    <>
      <SEO
        title={page.title}
        description={page.description}
        pathname={location?.pathname}
        noindex
      />
      <CVPageBody data={data} variant={variant} />
    </>
  );
};

export default CVVariantTemplate;
