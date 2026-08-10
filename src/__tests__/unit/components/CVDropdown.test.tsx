import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import CVDropdown from '../../../components/cv/CVDropdown';

const OPTIONS = [
  { value: 'full', label: 'full cv' },
  { value: 'resume', label: 'one page' },
  { value: 'letter', label: 'cover letter' },
];

const renderDropdown = (
  props: Partial<React.ComponentProps<typeof CVDropdown>> = {}
) => {
  const onSelect = jest.fn();
  const utils = render(
    <div>
      <CVDropdown
        ariaLabel="Choose CV length"
        triggerLabel="full cv"
        options={OPTIONS}
        value="full"
        onSelect={onSelect}
        {...props}
      />
      <button type="button">outside</button>
    </div>
  );
  return { ...utils, onSelect };
};

const trigger = () => screen.getByRole('button', { name: 'Choose CV length' });

describe('CVDropdown', () => {
  it('is a button rather than a native select, and says what it opens', () => {
    renderDropdown();

    expect(trigger()).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(document.querySelector('select')).toBeNull();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens on click and closes on a second click', async () => {
    const user = userEvent.setup();
    renderDropdown();

    await user.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.click(trigger());
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('moves focus into the list on open and back to the trigger on Escape', async () => {
    const user = userEvent.setup();
    renderDropdown();

    await user.click(trigger());
    expect(screen.getByRole('listbox')).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('walks the options with the arrow keys and picks one with Enter', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderDropdown();

    trigger().focus();
    await user.keyboard('{ArrowDown}');

    const listbox = screen.getByRole('listbox');
    const options = screen.getAllByRole('option');
    // Opens on the current value, not blindly at the top.
    expect(listbox).toHaveAttribute('aria-activedescendant', options[0].id);

    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(screen.getByRole('listbox')).toHaveAttribute(
      'aria-activedescendant',
      screen.getAllByRole('option')[2].id
    );

    // And it wraps.
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toHaveAttribute(
      'aria-activedescendant',
      screen.getAllByRole('option')[0].id
    );

    await user.keyboard('{ArrowUp}{Enter}');
    expect(onSelect).toHaveBeenCalledWith('letter');
    expect(trigger()).toHaveFocus();
  });

  it('opens at the last option on ArrowUp', async () => {
    const user = userEvent.setup();
    renderDropdown();

    trigger().focus();
    await user.keyboard('{ArrowUp}');

    expect(screen.getByRole('listbox')).toHaveAttribute(
      'aria-activedescendant',
      screen.getAllByRole('option')[2].id
    );
  });

  it('closes on an outside click without losing focus to nowhere', async () => {
    const user = userEvent.setup();
    renderDropdown();

    await user.click(trigger());
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'outside' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(document.activeElement).not.toBe(document.body);
  });

  it('marks the selected option, and marks nothing when there is no value', async () => {
    const user = userEvent.setup();
    const { unmount } = renderDropdown({ value: 'resume' });

    await user.click(trigger());
    const options = screen.getAllByRole('option');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveClass('is-selected');
    unmount();

    // An action menu — nothing stays chosen after the click.
    renderDropdown({ value: undefined });
    await user.click(trigger());
    expect(screen.getAllByRole('option')[0]).not.toHaveAttribute(
      'aria-selected'
    );
  });

  it('will not act on a disabled option', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderDropdown({
      options: [
        { value: 'full', label: 'full cv' },
        { value: 'resume', label: 'one page', disabled: true },
      ],
    });

    await user.click(trigger());
    await user.click(screen.getByRole('option', { name: 'one page' }));

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });
});
