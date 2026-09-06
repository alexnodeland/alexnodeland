import React from 'react';
import { DURATION_FAST_MS, EASE_OUT } from '../config/motion';
import { isTypingTarget } from '../lib/utils/keys';
import { prefersReducedMotion } from '../lib/utils/motion';
import '../styles/shortcuts.scss';
import CloseIcon from './ui/CloseIcon';

/**
 * The site's keyboard shortcuts, in one place.
 *
 * They used to be printed permanently under both floating pills — two hint
 * rows costing real vertical field for something you read once. This is the
 * same information behind `?`, plus one quiet line at the bottom of the screen
 * saying where it lives.
 *
 * It renders from the persistent shell, so it mounts once for the whole site.
 */
interface Shortcut {
  keys: string[];
  label: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['←', '→'], label: 'switch background' },
  { keys: ['S'], label: 'background settings' },
  { keys: ['H'], label: 'hide chrome' },
  { keys: ['C'], label: 'chat' },
  { keys: ['?'], label: 'this list' },
];

// The panel's arrival: `--duration-fast`, small enough to read as the panel
// appearing rather than as an animation.
const OPEN_MS = DURATION_FAST_MS;

const Shortcuts: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  // Where focus was when the dialog took it, so it can be handed back.
  const returnFocusRef = React.useRef<HTMLElement | null>(null);

  const toggle = React.useCallback(() => {
    setOpen(value => {
      if (!value && typeof document !== 'undefined') {
        returnFocusRef.current = document.activeElement as HTMLElement | null;
      }
      return !value;
    });
  }, []);

  const close = React.useCallback(() => setOpen(false), []);

  // `?` is Shift+/ on most layouts and its own key on others, so the character
  // is what is matched rather than a physical code.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== '?') return;
      if (isTypingTarget(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      toggle();
    };
    // Capture phase, so an Escape that closes this list is marked handled
    // before the background manager — which closes the settings panel on the
    // same key — gets to see it.
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open, toggle, close]);

  // Focus in on open, and back where it came from on close.
  React.useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
      return;
    }
    const previous = returnFocusRef.current;
    returnFocusRef.current = null;
    if (previous && typeof previous.focus === 'function') previous.focus();
  }, [open]);

  // The entrance: the site's one arrival (the `reveal` keyframe's rise), small
  // enough to read as the panel arriving rather than as an animation. Silent
  // when the user has asked for less motion.
  React.useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel || typeof panel.animate !== 'function') return;
    if (prefersReducedMotion()) return;
    panel.animate(
      [
        { opacity: 0, transform: 'translateY(4px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: OPEN_MS, easing: EASE_OUT }
    );
  }, [open]);

  return (
    <>
      {/* Bottom-centre of the field, below the spectrogram's audio indicator
          rather than beside it. At rest it is the key cap alone — the word is
          a caption for a glyph that already says what it is — and it unrolls
          on hover or keyboard focus. The name is carried by the label rather
          than by the text, so it reads the same whether the word is out or
          not. A button, because it does something. */}
      <button
        type="button"
        className="shortcuts-hint"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="keyboard shortcuts"
      >
        <kbd>?</kbd>
        <span className="shortcuts-hint-label" aria-hidden="true">
          shortcuts
        </span>
      </button>

      {open && (
        <div
          className="shortcuts-overlay"
          // An outside click closes it; the panel below stops the event, so
          // clicks inside do not.
          onMouseDown={close}
        >
          <div
            className="shortcuts-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="keyboard shortcuts"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="shortcuts-panel-header">
              <span className="shortcuts-title">keyboard shortcuts</span>
              <button
                type="button"
                className="shortcuts-close"
                onClick={close}
                ref={closeButtonRef}
                aria-label="close"
              >
                <CloseIcon />
              </button>
            </div>
            <ul className="shortcuts-list">
              {SHORTCUTS.map(shortcut => (
                <li key={shortcut.label}>
                  <span className="shortcuts-keys">
                    {shortcut.keys.map(key => (
                      <kbd key={key}>{key}</kbd>
                    ))}
                  </span>
                  <span className="shortcuts-label">{shortcut.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
};

export default Shortcuts;
