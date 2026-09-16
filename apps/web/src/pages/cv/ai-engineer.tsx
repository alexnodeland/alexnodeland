import React from 'react';
import CVPageBody from '../../components/cv/CVPageBody';
import SEO from '../../components/seo';
import { aiEngineerData } from '../../config/cv';
import '../../styles/cv.scss';

/**
 * The AI Engineer resume, as a page.
 *
 * Unlisted: not in the nav, not linked from /cv/, not in the sitemap, and
 * `noindex`. It exists so one address can go into an application beside the
 * PDF. The body is the /cv/ page's own, so the two cannot drift apart; the
 * hero ("alex → cv", and the role as its tagline) is in heroes.tsx.
 */
const AIEngineerResumePage: React.FC<{ location?: { pathname?: string } }> = ({
  location,
}) => (
  <>
    <SEO
      title="cv · ai engineer"
      description="Alex Nodeland — resume for AI Engineer roles"
      pathname={location?.pathname}
      noindex
    />
    <CVPageBody data={aiEngineerData} variant="ai-engineer" />
  </>
);

export default AIEngineerResumePage;
