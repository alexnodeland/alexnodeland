import React, { useState } from 'react';
import '../styles/mobile-notice.scss';

const MobileInteractivityNotice: React.FC = () => {
  const [showPopup, setShowPopup] = useState(false);

  const handleClick = () => {
    setShowPopup(true);
  };

  const handleClose = () => {
    setShowPopup(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <>
      {/* Mobile-only interactive features button */}
      <div className="mobile-interactivity-container">
        <button
          className="mobile-interactivity-btn"
          onClick={handleClick}
          aria-label="Interactive features information"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2L2 7V12C2 16.5 4.23 20.68 7.62 21.94L12 23.5L16.38 21.94C19.77 20.68 22 16.5 22 12V7L12 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 8V12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="16" r="1" fill="currentColor" />
          </svg>
          <span className="mobile-interactivity-label">interactivity</span>
        </button>
      </div>

      {/* Popup/Modal */}
      {showPopup && (
        <div className="mobile-notice-overlay" onClick={handleBackdropClick}>
          <div className="mobile-notice-popup">
            <button
              className="mobile-notice-close"
              onClick={handleClose}
              aria-label="Close"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="mobile-notice-content">
              <h2>desktop experience</h2>
              <p className="mobile-notice-subtitle">
                for the full interactive experience
              </p>

              <div className="mobile-notice-features">
                <div className="feature-item">
                  <span className="feature-icon">🎨</span>
                  <span>manipulate animated backgrounds</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🎹</span>
                  <span>play a fully functional synthesizer</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">💬</span>
                  <span>chat with a local LLM about this website</span>
                </div>
              </div>

              <p className="mobile-notice-recommend">
                use a modern browser like Chrome or Safari on desktop
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileInteractivityNotice;
