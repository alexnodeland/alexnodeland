import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import AppsPage from '../../../pages/apps';
import { appsConfig, projectsInTier } from '../../../config/projects';

jest.mock('../../../components/seo', () => ({
  __esModule: true,
  default: ({ title }: { title?: string }) => (
    <div data-testid="seo" data-title={title} />
  ),
}));

jest.mock('../../../styles/projects.scss', () => ({}));

const APPS = projectsInTier('app');
const PLATFORMS = appsConfig.platforms.filter(platform =>
  APPS.some(app => app.platform === platform.id)
);

const cardFor = (name: string) =>
  screen.getByText(name).closest('.project-card') as HTMLElement;

const cardNames = () =>
  Array.from(document.querySelectorAll('.project-name')).map(
    node => node.textContent
  );

describe('Apps Page', () => {
  it('renders SEO and the control row, and no hero of its own', () => {
    render(<AppsPage />);
    expect(screen.getByTestId('seo')).toHaveAttribute('data-title', 'apps');
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Filter apps by platform' })
    ).toBeInTheDocument();
  });

  it('gives every app a platform the page has a section for', () => {
    const known = new Set(appsConfig.platforms.map(p => p.id));
    for (const app of APPS) {
      expect(app.platform && known.has(app.platform)).toBe(true);
    }
  });

  it('renders a section per platform, in the config order, with its apps', () => {
    const { container } = render(<AppsPage />);
    expect(
      Array.from(container.querySelectorAll('.projects-section')).map(
        section => section.id
      )
    ).toEqual(PLATFORMS.map(p => p.id));

    for (const platform of PLATFORMS) {
      const section = container.querySelector(`#${platform.id}`) as HTMLElement;
      expect(section.querySelector('h2')).toHaveTextContent(platform.title);
      expect(
        Array.from(section.querySelectorAll('.project-name')).map(
          node => node.textContent
        )
      ).toEqual(
        APPS.filter(app => app.platform === platform.id).map(app => app.name)
      );
    }
  });

  it('shows the note under a section, with its link', () => {
    const noted = PLATFORMS.find(platform => platform.note?.link);
    if (!noted?.note?.link)
      throw new Error('no platform carries a linked note');
    const { container } = render(<AppsPage />);
    const note = container.querySelector(
      `#${noted.id} .projects-section-note`
    ) as HTMLElement;
    expect(note).toHaveTextContent(noted.note.before);
    const link = screen.getByRole('link', { name: noted.note.link.label });
    expect(link).toHaveAttribute('href', noted.note.link.href);
    expect(note).toContainElement(link);
  });

  it('shows each install line exactly as the config writes it', () => {
    render(<AppsPage />);
    for (const app of APPS) {
      const line = cardFor(app.name).querySelector('.project-install code');
      if (app.install) expect(line).toHaveTextContent(app.install);
      else expect(line).toBeNull();
    }
  });

  it('installs every mac app from the tap, as a cask', () => {
    for (const app of APPS.filter(a => a.platform === 'macos')) {
      expect(app.install).toMatch(
        /^brew install --cask alexnodeland\/tap\/[a-z-]+$/
      );
    }
  });

  it('narrows to one platform, and back', async () => {
    const user = userEvent.setup();
    const { container } = render(<AppsPage />);
    const trigger = screen.getByRole('button', {
      name: 'Filter apps by platform',
    });
    const target = PLATFORMS[1];

    await user.click(trigger);
    expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual([
      'all',
      ...PLATFORMS.map(p => p.title),
    ]);
    await user.click(screen.getByRole('option', { name: target.title }));

    expect(
      Array.from(container.querySelectorAll('.projects-section')).map(
        section => section.id
      )
    ).toEqual([target.id]);
    expect(cardNames()).toEqual(
      APPS.filter(app => app.platform === target.id).map(app => app.name)
    );

    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: 'all' }));
    expect(cardNames()).toHaveLength(APPS.length);
  });

  it('searches, and says so when nothing matches', () => {
    render(<AppsPage />);
    const field = screen.getByPlaceholderText('search apps...');

    fireEvent.change(field, { target: { value: APPS[0].name } });
    expect(cardNames()).toContain(APPS[0].name);

    fireEvent.change(field, { target: { value: 'zzzz-no-such-app' } });
    expect(cardNames()).toHaveLength(0);
    expect(
      screen.getByText(/no apps match "zzzz-no-such-app"/)
    ).toBeInTheDocument();
  });
});
