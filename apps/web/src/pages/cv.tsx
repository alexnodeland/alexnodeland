import React, { useState } from 'react';
import CVPageBody from '../components/cv/CVPageBody';
import SEO from '../components/seo';
import { cvData, resumeData } from '../config';
import '../styles/cv.scss';

type CVView = 'full' | 'resume';

// The page is the one CV body (see CVPageBody) plus the one thing only this
// address has: the switch between the full CV and the one-pager. The role
// resumes at /cv/fde/ and /cv/ai-engineer/ render the same body without it.
const CVPage: React.FC<{ location?: { pathname?: string } }> = ({
  location,
}) => {
  const [view, setView] = useState<CVView>('full');
  const data = view === 'resume' ? resumeData : cvData;

  return (
    <>
      <SEO
        title="cv"
        description="Complete resume and CV for Alex Nodeland"
        pathname={location?.pathname}
      />
      <CVPageBody
        data={data}
        variant={view}
        onViewChange={next => {
          if (next === 'full' || next === 'resume') setView(next);
        }}
      />
    </>
  );
};

export default CVPage;
