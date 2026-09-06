import React, { useState } from 'react';

interface ClearConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  messageCount: number;
  skipConfirm?: boolean;
  isGenerating?: boolean;
  onSkipConfirmChange?: (value: boolean) => void;
}

// A dialog over the panel, in the site's one dialog grammar (`.dialog` in
// chat.scss): a header, a body, a row of secondary buttons, no scrim. The
// destructive button takes the danger ink under the pointer.
const ClearConfirmDialog: React.FC<ClearConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  messageCount,
  skipConfirm = false,
  isGenerating = false,
  onSkipConfirmChange,
}) => {
  const [dontAskAgain, setDontAskAgain] = useState(skipConfirm);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (isGenerating) return; // Prevent clearing during generation
    if (dontAskAgain && onSkipConfirmChange) {
      onSkipConfirmChange(true);
    }
    onConfirm();
  };

  const handleCancel = () => {
    setDontAskAgain(skipConfirm); // Reset to original value
    onCancel();
  };

  return (
    <div
      className="dialog-overlay clear-confirm-overlay"
      onClick={handleCancel}
    >
      <div
        className="dialog clear-confirm-dialog"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-dialog-title"
      >
        <div className="dialog-header clear-confirm-header">
          <h3 id="clear-dialog-title">clear chat?</h3>
        </div>

        <div className="dialog-body clear-confirm-content">
          <p className="clear-message">
            this will delete <strong>{messageCount}</strong> message
            {messageCount !== 1 ? 's' : ''}
          </p>
          {isGenerating && (
            <p className="dialog-warning generation-warning">
              cannot clear while generating a response
            </p>
          )}

          <label className="dialog-checkbox dont-ask-checkbox">
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={e => setDontAskAgain(e.target.checked)}
            />
            <span className="checkbox-label">don&apos;t ask me again</span>
          </label>
        </div>

        <div className="dialog-actions clear-confirm-actions">
          <button
            type="button"
            className="clear-cancel-button"
            onClick={handleCancel}
            autoFocus
          >
            cancel
          </button>
          <button
            type="button"
            className="dialog-danger clear-confirm-button"
            onClick={handleConfirm}
            disabled={isGenerating}
            title={
              isGenerating
                ? 'cannot clear while generating a response'
                : 'clear chat history'
            }
          >
            clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClearConfirmDialog;
