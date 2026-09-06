import { Link } from 'gatsby';
import React from 'react';
import NotFoundScene, {
  NotFoundVariant,
  pickNotFoundVariant,
} from '../components/NotFoundScene';
import SEO from '../components/seo';
import { markNotFound } from '../lib/notFound';
import '../styles/404.scss';

// A missing page has no path of its own to resolve a hero from — it is
// rendered at whatever address was typed — so it raises a flag while it is
// up and the shell wears the 404 hero for it (src/lib/notFound.ts).
//
// Then the page comes apart. The shell's chrome drifts off the field
// (404.scss, keyed off `data-not-found` on the root), and behind it one of
// the site's own simulations, picked at random per visit, decays into the
// only thing left standing: the number. See NotFoundScene.
const NotFoundPage: React.FC = () => {
  // Chosen after mount: it is random, and the server render has to be the
  // one the client then agrees with.
  const [variant, setVariant] = React.useState<NotFoundVariant | null>(null);

  React.useEffect(() => {
    markNotFound(true);
    return () => markNotFound(false);
  }, []);

  React.useEffect(() => {
    const chosen = pickNotFoundVariant();
    setVariant(chosen);

    // How the chrome comes apart is drawn once per visit too: which way the
    // window slides, how far, and which way it leans.
    const root = document.documentElement;
    const sign = Math.random() < 0.5 ? -1 : 1;
    const drop = Math.round(window.innerHeight * (0.12 + Math.random() * 0.08));
    root.dataset.notFound = chosen;
    root.style.setProperty(
      '--nf-dx',
      `${sign * Math.round(20 + Math.random() * 40)}px`
    );
    root.style.setProperty('--nf-dy', `${drop}px`);
    root.style.setProperty(
      '--nf-rot',
      `${(-sign * (1.5 + Math.random() * 2)).toFixed(2)}deg`
    );
    return () => {
      delete root.dataset.notFound;
      root.style.removeProperty('--nf-dx');
      root.style.removeProperty('--nf-dy');
      root.style.removeProperty('--nf-rot');
    };
  }, []);

  return (
    <>
      <SEO title="404" noindex />
      <div className="not-found">
        <p>
          there is no page at this address. the rest of the site is where it
          was.
        </p>
        <Link to="/" className="back-home">
          back to the front page
        </Link>
      </div>
      {variant && <NotFoundScene variant={variant} />}
    </>
  );
};

export default NotFoundPage;
