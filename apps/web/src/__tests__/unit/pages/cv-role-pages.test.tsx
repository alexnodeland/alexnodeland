import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { navigate } from 'gatsby';
import React from 'react';
import CVControlBar from '../../../components/cv/CVControlBar';
import { searchCV } from '../../../components/cv/CVSearch';
import { heroKeyFor, resolveHero } from '../../../components/heroes';
import {
  buildVariant,
  CV_ARTIFACTS,
  CV_PAGES,
  cvData,
  RoleVariant,
} from '../../../config/cv';
import CVPage from '../../../pages/cv';
import CVVariantTemplate from '../../../templates/cv-variant';

jest.mock('../../../components/seo', () => ({
  __esModule: true,
  default: ({ title, noindex }: { title?: string; noindex?: boolean }) => (
    <div
      data-testid="seo"
      data-title={title}
      data-noindex={String(!!noindex)}
    />
  ),
}));

jest.mock('../../../styles/cv.scss', () => ({}));

// Every role variant is held to the same assertions, read from the page list,
// so a variant added to src/config/cv-pages.json is tested without a line of
// this file changing.
const ROLE_VARIANTS = Object.keys(CV_PAGES) as RoleVariant[];

const renderRolePage = (variant: RoleVariant) =>
  render(
    <CVVariantTemplate
      pageContext={{ variant }}
      location={{ pathname: CV_PAGES[variant].path }}
    />
  );

// The body is shared, so the role pages are held to the /cv/ page's own
// structure rather than to a copy of it.
const structureOf = (container: HTMLElement) => ({
  overviewCard: !!container.querySelector('.cv-overview-contact'),
  controlRow: !!container.querySelector('.cv-control-bar'),
  search: !!container.querySelector('#cv-search'),
  sections: Array.from(
    container.querySelectorAll('#resume-content > section[id]')
  ).map(section => section.id),
});

describe('the generated role-variant pages', () => {
  it('exist for at least the variants the site started with', () => {
    expect(ROLE_VARIANTS).toEqual(
      expect.arrayContaining(['fde', 'ai-engineer'])
    );
  });

  it.each(ROLE_VARIANTS)(
    '%s renders the same body as /cv/, with no hero or header of its own',
    variant => {
      const cv = structureOf(render(<CVPage />).container);
      const { container } = renderRolePage(variant);
      const role = structureOf(container);

      expect(role.overviewCard).toBe(cv.overviewCard);
      expect(role.controlRow).toBe(cv.controlRow);
      expect(role.search).toBe(cv.search);
      // Same sections, same order; certifications are full-CV only.
      const expected = cv.sections.filter(id => id !== 'cv-certifications');
      expect(role.sections).toEqual(expected);
      // The hero is generated in heroes.tsx, as /cv/'s lives there.
      expect(
        screen.queryByRole('heading', { level: 1 })
      ).not.toBeInTheDocument();
    }
  );

  it.each(ROLE_VARIANTS)(
    '%s is kept out of search engines, under its own title',
    variant => {
      renderRolePage(variant);
      const seo = screen.getByTestId('seo');
      expect(seo).toHaveAttribute('data-noindex', 'true');
      expect(seo).toHaveAttribute('data-title', CV_PAGES[variant].title);
    }
  );

  it('leaves /cv/ itself indexable', () => {
    render(<CVPage />);
    expect(screen.getByTestId('seo')).toHaveAttribute('data-noindex', 'false');
  });

  it.each(ROLE_VARIANTS)(
    '%s gets a hero of its own, in the CV hero’s style, with its tagline',
    variant => {
      const page = CV_PAGES[variant];
      expect(heroKeyFor(page.path)).toBe(page.path.replace(/\/+$/, ''));

      const { container } = render(<>{resolveHero(page.path).hero}</>);
      expect(container.querySelector('.cv-page-header')).not.toBeNull();
      expect(container).toHaveTextContent(page.tagline);
    }
  );

  it.each(ROLE_VARIANTS)('%s has a PDF artifact to build', variant => {
    expect(CV_ARTIFACTS[variant].maxPages).toBe(1);
  });

  it.each(ROLE_VARIANTS)(
    '%s keeps its projects for the PDF and off the page',
    variant => {
      expect(buildVariant(variant).projects?.length).toBeGreaterThan(0);
      const { container } = renderRolePage(variant);
      expect(container.querySelector('#cv-projects')).toBeNull();
    }
  );

  it('keeps projects off /cv/ too', () => {
    expect(cvData.projects?.length).toBeGreaterThan(0);
    const { container } = render(<CVPage />);
    expect(container.querySelector('#cv-projects')).toBeNull();
  });
});

describe('the document menu', () => {
  it.each(ROLE_VARIANTS)(
    'on %s, names the page it is on, beside both lengths of /cv/',
    async variant => {
      const user = userEvent.setup();
      renderRolePage(variant);

      const menu = screen.getByRole('button', { name: /choose cv length/i });
      expect(menu).toHaveTextContent(CV_PAGES[variant].label);

      await user.click(menu);
      const options = screen
        .getAllByRole('option')
        .map(option => option.textContent);
      expect(options).toEqual(['full cv', 'one page', CV_PAGES[variant].label]);
    }
  );

  it('navigates from a role page, rather than switching in place', async () => {
    const user = userEvent.setup();
    renderRolePage('fde');

    await user.click(screen.getByRole('button', { name: /choose cv length/i }));
    await user.click(screen.getByRole('option', { name: 'one page' }));
    expect(navigate).toHaveBeenCalledWith('/cv/?view=resume');

    await user.click(screen.getByRole('button', { name: /choose cv length/i }));
    await user.click(screen.getByRole('option', { name: 'full cv' }));
    expect(navigate).toHaveBeenCalledWith('/cv/');
  });

  it('opens /cv/ on the one-pager when the address asks for it', () => {
    render(<CVPage location={{ pathname: '/cv/', search: '?view=resume' }} />);
    expect(
      screen.getByRole('button', { name: /choose cv length/i })
    ).toHaveTextContent('one page');
  });
});

describe('CVControlBar without a view to switch', () => {
  it('drops the length menu and keeps the downloads', () => {
    render(
      <CVControlBar
        resumeData={buildVariant('ai-engineer')}
        view="ai-engineer"
      />
    );

    expect(
      screen.queryByRole('button', { name: /choose cv length/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /download the cv/i })
    ).toBeInTheDocument();
  });
});

describe('searchCV', () => {
  it('does not offer projects, which the page no longer shows', () => {
    const fde = buildVariant('fde');
    expect(searchCV(fde, 'reflex')).toEqual([]);
    expect(
      searchCV(fde, 'probabilistic programming').map(result => result.title)
    ).not.toContain('fugue');
  });
});
