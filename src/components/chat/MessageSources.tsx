import { Link } from 'gatsby';
import React from 'react';
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
 * The pages a grounded answer drew on, rendered under it.
 *
 * This is the part of the chat that makes a small model trustworthy: a 1.2B
 * model asserting a date is worth very little on its own, and worth rather a
 * lot when the sentence next to it links to the page the date came from. It
 * also gives visitors somewhere to go, which a chat answer otherwise does not.
 */
const MessageSources: React.FC<MessageSourcesProps> = ({ sources }) => {
  const { setChatOpen } = useChat();

  if (!sources || sources.length === 0) return null;

  return (
    <div className="message-sources">
      <span className="sources-label">sources</span>
      <ul className="sources-list">
        {sources.map(source => {
          const external = /^https?:/.test(source.url);
          const label = (
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
                  className="source-chip"
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {label}
                </a>
              ) : (
                // Internal links navigate client-side, so the chat is closed
                // explicitly — otherwise the modal would sit over the page the
                // visitor just asked to see.
                <Link
                  className="source-chip"
                  to={source.url}
                  onClick={() => setChatOpen(false)}
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default MessageSources;
