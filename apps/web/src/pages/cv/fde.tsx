import React from 'react';
import CVPageBody from '../../components/cv/CVPageBody';
import SEO from '../../components/seo';
import { fdeData } from '../../config/cv';
import '../../styles/cv.scss';

/**
 * The Forward Deployed Engineer resume, as a page.
 *
 * Unlisted: not in the nav, not linked from /cv/, not in the sitemap, and
 * `noindex`. It exists so one address can be shared beside the PDF. The body
 * is the /cv/ page's own, so the two cannot drift apart; the hero ("alex →
 * cv", and the role as its tagline) is in heroes.tsx.
 */
const FDEResumePage: React.FC<{ location?: { pathname?: string } }> = ({
  location,
}) => (
  <>
    <SEO
      title="cv · forward deployed engineer"
      description="Alex Nodeland — resume for Forward Deployed Engineer roles"
      pathname={location?.pathname}
      noindex
    />
    <CVPageBody data={fdeData} variant="fde" />
  </>
);

export default FDEResumePage;
