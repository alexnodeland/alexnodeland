import React from 'react';
import CVVariantPage from '../../components/cv/CVVariantPage';
import { aiEngineerData } from '../../config/cv';

// Unlisted on purpose — see the note in CVVariantPage.
const AIEngineerResumePage: React.FC<{ location?: { pathname?: string } }> = ({
  location,
}) => (
  <CVVariantPage
    variant="ai-engineer"
    data={aiEngineerData}
    label="AI Engineer"
    location={location}
  />
);

export default AIEngineerResumePage;
