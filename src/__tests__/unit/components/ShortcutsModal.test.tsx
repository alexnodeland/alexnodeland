import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import Shortcuts from '../../../components/ShortcutsModal';

jest.mock('../../../styles/shortcuts.scss', () => ({}));

const press = (key: string, target: Element | Window = window) =>
  fireEvent.keyDown(target, { key });

describe('Shortcuts', () => {
  it('shows the hint and nothing else at rest', () => {
    render(<Shortcuts />);

    const hint = screen.getByRole('button', { name: /shortcuts/i });
    expect(hint).toHaveClass('shortcuts-hint');
    expect(hint).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens on ? and closes on ? again', () => {
    render(<Shortcuts />);

    press('?');
    const dialog = screen.getByRole('dialog', { name: 'keyboard shortcuts' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // Every shortcut the site actually has, in one list.
    expect(screen.getByText('switch background')).toBeInTheDocument();
    expect(screen.getByText('chat')).toBeInTheDocument();
    expect(screen.getByText('hide chrome')).toBeInTheDocument();

    press('?');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens from the hint and closes on escape', async () => {
    const user = userEvent.setup();
    render(<Shortcuts />);

    await user.click(screen.getByRole('button', { name: /shortcuts/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Focus goes into the dialog rather than being left on the field.
    expect(screen.getByRole('button', { name: 'close' })).toHaveFocus();

    press('Escape');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // And comes back to whatever opened it.
    expect(screen.getByRole('button', { name: /shortcuts/i })).toHaveFocus();
  });

  it('closes on a click outside but not on one inside', () => {
    render(<Shortcuts />);
    press('?');

    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.mouseDown(
      document.querySelector('.shortcuts-overlay') as HTMLElement
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('leaves ? alone while the reader is typing', () => {
    render(
      <>
        <input aria-label="search" />
        <Shortcuts />
      </>
    );

    const input = screen.getByLabelText('search');
    input.focus();
    press('?', input);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
