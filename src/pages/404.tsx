import { Link } from 'gatsby';
import React from 'react';
import SEO from '../components/seo';
import '../styles/404.scss';

// No hero: the shell resolves one per path, and a path it does not know is a
// path with nothing to title. The window frame is all the page gets.
const NotFoundPage: React.FC = () => {
  return (
    <>
      <SEO title="404" />
      <div className="not-found">
        <h1>404: Not Found</h1>
        <p>Sorry, the page you&apos;re looking for doesn&apos;t exist.</p>
        <Link to="/" className="back-home">
          ← Back to Home
        </Link>
      </div>
    </>
  );
};

export default NotFoundPage;
