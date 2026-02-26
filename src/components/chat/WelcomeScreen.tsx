import React, { useState } from 'react';
import { chatConfig } from '../../config/chat';
import { useChat } from './ChatContext';

const WelcomeScreen: React.FC = () => {
  const {
    selectedModel,
    availableModels,
    loadModel,
    modelState,
    webGPUSupported,
  } = useChat();
  const [showInfoPopover, setShowInfoPopover] = useState(false);
  const [attemptedWorkerInit, setAttemptedWorkerInit] = useState(false);

  const currentModel = availableModels.find(m => m.id === selectedModel);
  const modelName = currentModel?.name || 'AI Model';
  const modelSize = currentModel?.size || '~1.2GB';
  const modelDescription = currentModel?.description || 'A local AI model';

  const handleStartDownload = () => {
    setAttemptedWorkerInit(true);
    if (loadModel) {
      loadModel(selectedModel);
    }
  };

  // Check if worker initialization has failed after an attempt
  const workerInitFailed =
    attemptedWorkerInit &&
    modelState?.status === 'idle' &&
    webGPUSupported === null;

  const getHuggingFaceUrl = (modelId: string) => {
    return `https://huggingface.co/${modelId}`;
  };

  return (
    <div className="chat-welcome-screen">
      <div className="welcome-content">
        <div className="welcome-header">
          <div className="welcome-icon">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3>welcome to chat</h3>
          <p className="welcome-subtitle">
            {chatConfig.interface.welcomeMessage}
          </p>
        </div>

        <div className="welcome-body">
          {workerInitFailed && (
            <div
              className="error-notice"
              style={{
                background: 'rgba(255, 193, 7, 0.1)',
                border: '1px solid rgba(255, 193, 7, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                marginBottom: '1rem',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
              }}
            >
              <strong>⚠️ Worker initialization failed</strong>
              <br />
              Chat is available in basic mode. Try refreshing the page to
              restore full functionality.
            </div>
          )}

          <div className="welcome-features">
            <div className="feature-item">
              <div className="feature-icon">🔒</div>
              <div className="feature-text">
                <strong>private</strong>
                <br />
                never leaves your device
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">⚡</div>
              <div className="feature-text">
                <strong>fast</strong>
                <br />
                Hardware accelerated
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📱</div>
              <div className="feature-text">
                <strong>offline</strong>
                <br />
                Works without internet
              </div>
            </div>
          </div>
        </div>

        <div className="welcome-actions">
          <p className="download-note">Downloads once, cached forever</p>

          <div className="download-button-group">
            <button
              className="download-button"
              onClick={handleStartDownload}
              aria-label={`Download ${modelName} model`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              download {modelName.toLowerCase()}
            </button>
            <button
              className="info-button"
              onClick={() => setShowInfoPopover(!showInfoPopover)}
              aria-label={`Show ${modelName} model information`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="m9,9 0,0 a3,3 0 0,1 6,0 c0,2 -3,3 -3,3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="m9 17 h6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {showInfoPopover && (
            <div className="info-popover">
              <div className="info-popover-content">
                <div className="info-header">
                  <h4>{modelName}</h4>
                </div>
                <p className="info-description">{modelDescription}</p>
                <div className="info-details">
                  <div className="info-item">
                    <strong>size:</strong> {modelSize}
                  </div>
                  <div className="info-item">
                    <strong>location:</strong> browser cache
                  </div>
                  <div className="info-item">
                    <strong>privacy:</strong> runs completely offline
                  </div>
                  <div className="info-item">
                    <strong>compatibility:</strong>
                    <div className="compatibility-badges">
                      {currentModel?.device && (
                        <span
                          className={`device-badge device-${currentModel.device}`}
                        >
                          {currentModel.device === 'webgpu' ? 'gpu' : 'GPU'}
                        </span>
                      )}
                      {currentModel?.fallbackDevice && (
                        <span
                          className={`device-badge device-${currentModel.fallbackDevice}`}
                        >
                          {currentModel.fallbackDevice === 'wasm'
                            ? 'wasm'
                            : 'CPU'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <a
                  href={getHuggingFaceUrl(selectedModel)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="huggingface-link"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  view on hugging face
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
