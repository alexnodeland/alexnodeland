import React, { useEffect, useState } from 'react';
import CVPageBody from '../components/cv/CVPageBody';
import SEO from '../components/seo';
import { cvData, cvGraph, resumeData } from '../config';
import '../styles/cv.scss';

type CVView = 'full' | 'resume';

// The page is the one CV body (see CVPageBody) plus the one thing only this
// address has: switching between the full CV and the one-pager in place. The
// role resumes at /cv/fde/, /cv/ai-engineer/ and /cv/music-tech/ render the same body, and
// their menu navigates here instead.
const CVPage: React.FC<{
  location?: { pathname?: string; search?: string };
}> = ({ location }) => {
  const [view, setView] = useState<CVView>('full');
  const data = view === 'resume' ? resumeData : cvData;

  // `?view=resume` opens the one-pager — it is where "one page" in a role
  // page's menu lands. Read after mount rather than as the initial state: the
  // static HTML is the full CV, and a first render that disagreed with it
  // would not hydrate.
  useEffect(() => {
    const search = location?.search ?? window.location.search;
    if (new URLSearchParams(search).get('view') === 'resume') setView('resume');
  }, [location?.search]);

  // And the address follows the switch, so a reload or a copied link shows
  // what was on screen. replaceState: a length is not a place to go back to.
  const changeView = (next: CVView) => {
    setView(next);
    const url = new URL(window.location.href);
    if (next === 'resume') url.searchParams.set('view', 'resume');
    else url.searchParams.delete('view');
    window.history.replaceState(window.history.state, '', url);
  };

  return (
    <>
      <SEO
        title="cv"
        description="Complete resume and CV for Alex Nodeland"
        pathname={location?.pathname}
        type="profile"
        // The full CV as a graph, whichever view is showing: the structured
        // data describes the record, not the one-pager cut from it.
        jsonLd={cvGraph(cvData)}
      />
      <CVPageBody
        data={data}
        variant={view}
        onViewChange={next => {
          if (next === 'full' || next === 'resume') changeView(next);
        }}
      />
    </>
  );
};

export default CVPage;
