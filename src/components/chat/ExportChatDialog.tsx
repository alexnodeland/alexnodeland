import React, { useState } from 'react';
import { ChatMessage } from '../../types/chat';

interface ExportChatDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  messages: ChatMessage[];
}

/**
 * Formats the conversation as markdown. Thinking blocks live in
 * message.thinking (the worker strips <think> tags from content), so they
 * are only included when requested.
 */
export const formatMessagesToMarkdown = (
  messages: ChatMessage[],
  includeThinking: boolean
): string => {
  if (!messages || messages.length === 0) return '';

  return messages
    .map(message => {
      const parts: string[] = [
        `## ${message.role === 'user' ? 'User' : 'Assistant'}`,
      ];

      if (includeThinking && message.role === 'assistant' && message.thinking) {
        parts.push(
          `### Thinking\n\n${message.thinking.trim()}\n\n### Response`
        );
      }

      parts.push((message.content || '').trim());
      return parts.join('\n\n');
    })
    .join('\n\n---\n\n');
};

const ExportChatDialog: React.FC<ExportChatDialogProps> = ({
  isOpen,
  onCancel,
  messages,
}) => {
  const [includeThinking, setIncludeThinking] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const hasThinking = messages.some(m => m.thinking);

  const handleCopyToClipboard = async () => {
    setIsExporting(true);
    const markdown = formatMessagesToMarkdown(messages, includeThinking);
    try {
      await navigator.clipboard.writeText(markdown);
      onCancel();
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadFile = () => {
    setIsExporting(true);
    try {
      const markdown = formatMessagesToMarkdown(messages, includeThinking);
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `chat-export-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
      onCancel();
    } catch (err) {
      console.error('Failed to download file:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCancel = () => {
    if (!isExporting) {
      onCancel();
    }
  };

  return (
    <div className="export-chat-overlay" onClick={handleCancel}>
      <div
        className="export-chat-dialog"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
      >
        <div className="export-chat-header">
          <h3 id="export-dialog-title">export chat</h3>
        </div>

        <div className="export-chat-content">
          <p className="export-message">
            export <strong>{messages.length}</strong> message
            {messages.length !== 1 ? 's' : ''} as markdown
          </p>

          {hasThinking && (
            <label className="thinking-toggle-checkbox">
              <input
                type="checkbox"
                checked={includeThinking}
                onChange={e => setIncludeThinking(e.target.checked)}
                disabled={isExporting}
              />
              <span className="checkbox-label">include thinking blocks</span>
            </label>
          )}
        </div>

        <div className="export-chat-actions">
          <button
            className="export-cancel-button"
            onClick={handleCancel}
            disabled={isExporting}
          >
            cancel
          </button>
          <button
            className="export-copy-button"
            onClick={handleCopyToClipboard}
            disabled={isExporting || messages.length === 0}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            copy
          </button>
          <button
            className="export-download-button"
            onClick={handleDownloadFile}
            disabled={isExporting || messages.length === 0}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7,10 12,15 17,10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            download
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportChatDialog;
