import React from 'react';

interface ClearConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  messageCount: number;
}

const ClearConfirmDialog: React.FC<ClearConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  messageCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="clear-confirm-overlay" onClick={onCancel}>
      <div
        className="clear-confirm-dialog"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-dialog-title"
        aria-describedby="clear-dialog-description"
      >
        <div className="clear-confirm-header">
          <h3 id="clear-dialog-title">Clear Chat History</h3>
        </div>

        <div className="clear-confirm-content">
          <div className="warning-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <p id="clear-dialog-description">
            Are you sure you want to clear all chat history?
          </p>

          <div className="message-count-info">
            This will permanently delete{' '}
            <strong>
              {messageCount} message{messageCount !== 1 ? 's' : ''}
            </strong>{' '}
            and reset the conversation context.
          </div>

          <p className="warning-text">
            <strong>This action cannot be undone.</strong>
          </p>
        </div>

        <div className="clear-confirm-actions">
          <button className="clear-cancel-button" onClick={onCancel} autoFocus>
            Cancel
          </button>
          <button className="clear-confirm-button" onClick={onConfirm}>
            Clear History
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClearConfirmDialog;
