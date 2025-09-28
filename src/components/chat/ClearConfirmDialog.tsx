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
    <div className="clear-confirm-overlay" onClick={handleCancel}>
      <div
        className="clear-confirm-dialog"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-dialog-title"
      >
        <div className="clear-confirm-header">
          <h3 id="clear-dialog-title">clear chat?</h3>
        </div>

        <div className="clear-confirm-content">
          <p className="clear-message">
            this will delete <strong>{messageCount}</strong> message
            {messageCount !== 1 ? 's' : ''}
          </p>
          {isGenerating && (
            <p className="generation-warning">
              <strong>Cannot clear while generating response</strong>
            </p>
          )}

          <label className="dont-ask-checkbox">
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={e => setDontAskAgain(e.target.checked)}
            />
            <span className="checkbox-label">don&apos;t ask me again</span>
          </label>
        </div>

        <div className="clear-confirm-actions">
          <button
            className="clear-cancel-button"
            onClick={handleCancel}
            autoFocus
          >
            cancel
          </button>
          <button
            className="clear-confirm-button"
            onClick={handleConfirm}
            disabled={isGenerating}
            title={
              isGenerating
                ? 'Cannot clear while generating response'
                : 'Clear chat history'
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
