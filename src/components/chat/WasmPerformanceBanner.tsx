import React, { useState } from 'react';

interface WasmPerformanceBannerProps {
  isVisible: boolean;
}

const WasmPerformanceBanner: React.FC<WasmPerformanceBannerProps> = ({
  isVisible,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!isVisible) return null;

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleDismiss = () => {
    setIsCollapsed(true);
  };

  return (
    <div
      className={`wasm-performance-banner ${isCollapsed ? 'collapsed' : ''}`}
    >
      {isCollapsed ? (
        <button
          className="banner-expand-button"
          onClick={handleToggle}
          aria-label="Show performance notice"
          title="Click to expand performance notice"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 15L7 10H17L12 15Z" fill="currentColor" />
          </svg>
          <span className="banner-expand-text">Performance Notice</span>
        </button>
      ) : (
        <div className="banner-content">
          <div className="banner-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L13.09 8.26L18.18 5.82L15.74 10.91L22 12L15.74 13.09L18.18 18.18L13.09 15.74L12 22L10.91 15.74L5.82 18.18L8.26 13.09L2 12L8.26 10.91L5.82 5.82L10.91 8.26L12 2Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div className="banner-message">
            <div className="banner-title">Compatibility Mode Active</div>
            <div className="banner-description">
              Running on WebAssembly (WASM) for compatibility. For faster
              responses, try a modern browser with WebGPU support, like Chrome
              or Safari.
            </div>
          </div>
          <div className="banner-actions">
            <button
              className="banner-action-button banner-dismiss"
              onClick={handleDismiss}
              aria-label="Hide performance notice"
              title="Hide this notice"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M7 14L12 9L17 14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WasmPerformanceBanner;
