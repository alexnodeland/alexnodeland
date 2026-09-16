import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { navigate } from 'gatsby';
import React from 'react';
import CVControlBar from '../../../components/cv/CVControlBar';
import { searchCV } from '../../../components/cv/CVSearch';
import { aiEngineerData, cvData, fdeData } from '../../../config/cv';
import CVPage from '../../../pages/cv';
import AIEngineerResumePage from '../../../pages/cv/ai-engineer';
import FDEResumePage from '../../../pages/cv/fde';

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

describe('the role-specific resume pages', () => {
  it('render the same body as /cv/, with no hero or header of their own', () => {
    const cv = structureOf(render(<CVPage />).container);

    for (const Page of [FDEResumePage, AIEngineerResumePage]) {
      const { container, unmount } = render(<Page />);
      const role = structureOf(container);

      expect(role.overviewCard).toBe(cv.overviewCard);
      expect(role.controlRow).toBe(cv.controlRow);
      expect(role.search).toBe(cv.search);
      // Same sections, same order; certifications are full-CV only.
      expect(role.sections).toEqual(
        cv.sections.filter(id => id !== 'cv-certifications')
      );
      // The hero lives in heroes.tsx, as /cv/'s does.
      expect(
        screen.queryByRole('heading', { level: 1 })
      ).not.toBeInTheDocument();
      unmount();
    }
  });

  it('are kept out of search engines, where /cv/ is not', () => {
    const { unmount } = render(<FDEResumePage />);
    expect(screen.getByTestId('seo')).toHaveAttribute('data-noindex', 'true');
    unmount();

    render(<CVPage />);
    expect(screen.getByTestId('seo')).toHaveAttribute('data-noindex', 'false');
  });

  it('list each variant’s projects as cards, in the order the variant names them', () => {
    const { container } = render(<FDEResumePage />);
    const cards = container.querySelectorAll('#cv-projects .cv-project-card');

    expect(
      Array.from(cards).map(card => card.querySelector('h3')?.textContent)
    ).toEqual(fdeData.projects?.map(project => project.name));
    // Each card carries the projects page's marks, and the card itself
    // follows the site where there is one and the repo where there is not.
    Array.from(cards).forEach((card, index) => {
      const project = fdeData.projects![index];
      const repo = within(card as HTMLElement).getByRole('link', {
        name: `view ${project.name} on github`,
      });
      expect(repo).toHaveAttribute('href', project.github);

      const cardLink = (card as HTMLElement).querySelector('.is-card-link');
      expect(cardLink).toHaveAttribute('href', project.url ?? project.github);
      expect(repo.classList.contains('is-raised')).toBe(Boolean(project.url));
    });
  });

  it('show the full CV’s projects on /cv/ too', () => {
    const { container } = render(<CVPage />);
    expect(
      container.querySelectorAll('#cv-projects .cv-project-card')
    ).toHaveLength(cvData.projects?.length ?? 0);
  });
});

describe('the document menu', () => {
  it('names the role page it is on, and lists both lengths of /cv/ beside it', async () => {
    const user = userEvent.setup();
    render(<AIEngineerResumePage />);

    const menu = screen.getByRole('button', { name: /choose cv length/i });
    expect(menu).toHaveTextContent('ai engineer');

    await user.click(menu);
    const options = screen
      .getAllByRole('option')
      .map(option => option.textContent);
    expect(options).toEqual(['full cv', 'one page', 'ai engineer']);
  });

  it('navigates from a role page, rather than switching in place', async () => {
    const user = userEvent.setup();
    render(<FDEResumePage />);

    await user.click(screen.getByRole('button', { name: /choose cv length/i }));
    await user.click(screen.getByRole('option', { name: 'one page' }));
    expect(navigate).toHaveBeenCalledWith('/cv/?view=resume');
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
    render(<CVControlBar resumeData={aiEngineerData} view="ai-engineer" />);

    expect(
      screen.queryByRole('button', { name: /choose cv length/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /download the cv/i })
    ).toBeInTheDocument();
  });
});

describe('searchCV', () => {
  it('finds projects by name and by description, and points at their section', () => {
    const byName = searchCV(fdeData, 'reflex');
    expect(byName).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'project', title: 'reflex' }),
      ])
    );

    const byDescription = searchCV(fdeData, 'probabilistic programming');
    expect(byDescription.map(result => result.title)).toContain('fugue');
  });
});
