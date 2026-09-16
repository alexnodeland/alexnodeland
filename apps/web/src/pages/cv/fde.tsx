import React from 'react';
import CVVariantPage from '../../components/cv/CVVariantPage';
import { fdeData } from '../../config/cv';

// Unlisted on purpose — see the note in CVVariantPage.
const FDEResumePage: React.FC<{ location?: { pathname?: string } }> = ({
  location,
}) => (
  <CVVariantPage
    variant="fde"
    data={fdeData}
    label="Forward Deployed Engineer"
    location={location}
  />
);

export default FDEResumePage;
