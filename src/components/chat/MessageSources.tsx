import { Link } from 'gatsby';
import React, { useEffect, useId, useRef, useState } from 'react';
import { ChatSource } from '../../types/chat';
import { useChat } from './ChatContext';

/** Short tag shown before each source, so the kind of thing being linked is
 *  readable before the title is. */
const KIND_LABEL: Record<ChatSource['kind'], string> = {
  cv: 'cv',
  blog: 'writing',
  project: 'project',
  home: 'about',
};

interface MessageSourcesProps {
  sources: ChatSource[];
}

/**
 * The pages a grounded answer drew on.
 *
 * This is the part of the chat that makes a small model trustworthy: a 1.2B
 * model asserting a date is worth very little on its own, and worth rather a
 * lot when the sentence next to it links to the page the date came from.
 *
 * Rendered as a summary that opens a list rather than as inline chips. Chips
 * had to truncate — a blog title is longer than the bubble is wide — and a
 * source list where every title reads "Optimal Wavelet Bases For A…" tells the
 * visitor nothing and is not worth the row it occupies.
 */
const MessageSources: React.FC<MessageSourcesProps> = ({ sources }) => {
  const { setChatOpen } = useChat();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Ties the button to the list it opens. Several of these render in one
  // conversation, so the id has to be per-instance rather than a constant.
  const listId = useId();

  // Close on an outside click or Escape. Without this the panel survives
  // scrolling away from it, and several can end up open at once in a long
  // conversation.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!sources || sources.length === 0) return null;

  const label = `${sources.length} source${sources.length === 1 ? '' : 's'}`;

  return (
    <div className="message-sources" ref={containerRef}>
      <button
        type="button"
        className={`sources-toggle ${open ? 'is-open' : ''}`}
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label} for this answer`}
        onClick={() => setOpen(v => !v)}
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        </svg>
        {label}
      </button>

      {open && (
        <ul className="sources-popover" id={listId}>
          {sources.map(source => {
            const external = /^https?:/.test(source.url);
            const body = (
              <>
                <span className="source-kind">{KIND_LABEL[source.kind]}</span>
                <span className="source-title">{source.title}</span>
                {external && (
                  <svg
                    className="source-external"
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                )}
              </>
            );

            return (
              <li key={source.id}>
                {external ? (
                  <a
                    className="source-row"
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {body}
                  </a>
                ) : (
                  // Internal links navigate client-side, so the chat is closed
                  // explicitly — otherwise the modal would sit over the page
                  // the visitor just asked to see.
                  <Link
                    className="source-row"
                    to={source.url}
                    onClick={() => setChatOpen(false)}
                  >
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default MessageSources;
