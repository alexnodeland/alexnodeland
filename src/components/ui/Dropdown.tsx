import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface DropdownProps {
  /** Visible text on the trigger — the current value, or a verb for an action menu. */
  triggerLabel: string;
  /** What the control is, for screen readers; the trigger's visible text is only half the story. */
  ariaLabel: string;
  options: DropdownOption[];
  /**
   * The selected option, when the dropdown picks a value. Omitted for action
   * menus, where nothing stays chosen after the click.
   */
  value?: string;
  onSelect: (value: string) => void;
  /** Which edge the panel hangs from. Right for a right-justified trigger. */
  align?: 'start' | 'end';
  /** `action` gives the items the green treatment on hover; the trigger stays neutral either way. */
  tone?: 'neutral' | 'action';
  className?: string;
}

/**
 * The site's own dropdown, shared by every control row that needs one — the
 * CV's length and download pickers, the blog's tag and sort pickers. A native
 * <select> renders as the platform's widget, a grey slab with a system arrow,
 * which is the one thing on these pages that would not be ours; so the
 * trigger is a button in the frosted-chip chrome the rows use and the panel
 * is the window's material (scrim, blur, hairline), which the document
 * scrolling underneath does not read through.
 *
 * ARIA: the listbox pattern everywhere, so there is one keyboard contract on
 * the site rather than one per page. Focus moves into the list and the active
 * option is tracked with aria-activedescendant; the trigger gets focus back
 * when the panel closes.
 *
 * Styling lives in src/styles/controls.scss, loaded once via global.scss.
 */
const Dropdown: React.FC<DropdownProps> = ({
  triggerLabel,
  ariaLabel,
  options,
  value,
  onSelect,
  align = 'start',
  tone = 'neutral',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const reactId = useId();
  const listId = `dropdown-list-${reactId}`;
  const optionId = (index: number) => `${listId}-option-${index}`;

  const selectedIndex = options.findIndex(option => option.value === value);

  const close = useCallback((returnFocus: boolean) => {
    setIsOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  const open = useCallback(
    (index: number) => {
      setActiveIndex(Math.max(0, Math.min(index, options.length - 1)));
      setIsOpen(true);
    },
    [options.length]
  );

  const choose = useCallback(
    (index: number) => {
      const option = options[index];
      if (!option || option.disabled) return;
      close(true);
      onSelect(option.value);
    },
    [close, onSelect, options]
  );

  // Focus follows the panel: in when it opens, back to the trigger when it
  // closes. Without this the keyboard user is left on a button whose menu
  // they cannot reach.
  useEffect(() => {
    if (isOpen) listRef.current?.focus();
  }, [isOpen]);

  // Outside click closes. Bound on pointerdown so the panel is gone before the
  // click lands on whatever is underneath it; focus is handed back to the
  // trigger only if it was inside the panel, so it is never dropped on <body>
  // and never stolen from the thing being clicked.
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const container = containerRef.current;
      if (!container || container.contains(event.target as Node)) return;
      close(container.contains(document.activeElement));
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen, close]);

  const handleTriggerKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'Enter':
      case ' ':
        event.preventDefault();
        open(selectedIndex >= 0 ? selectedIndex : 0);
        break;
      case 'ArrowUp':
        event.preventDefault();
        open(options.length - 1);
        break;
      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          close(true);
        }
        break;
    }
  };

  const handleListKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex(index => (index + 1) % options.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex(index => (index - 1 + options.length) % options.length);
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        choose(activeIndex);
        break;
      case 'Escape':
        event.preventDefault();
        close(true);
        break;
      case 'Tab':
        // Let the tab land where it would have from the trigger rather than
        // trapping focus in a panel that is on its way out.
        close(true);
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`ui-dropdown ${align === 'end' ? 'align-end' : ''} ${tone === 'action' ? 'tone-action' : ''} ${className}`.trim()}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`ui-dropdown-trigger ${isOpen ? 'is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        aria-label={ariaLabel}
        onClick={() =>
          isOpen ? close(false) : open(selectedIndex >= 0 ? selectedIndex : 0)
        }
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="ui-dropdown-value">{triggerLabel}</span>
        <span className="ui-dropdown-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel}
          aria-activedescendant={optionId(activeIndex)}
          className="ui-dropdown-menu"
          onKeyDown={handleListKeyDown}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={
                value === undefined ? undefined : option.value === value
              }
              aria-disabled={option.disabled || undefined}
              className={`ui-dropdown-option ${index === activeIndex ? 'is-active' : ''} ${option.value === value ? 'is-selected' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(index)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dropdown;
