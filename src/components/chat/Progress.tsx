import React from 'react';
import { formatBytes } from '../../lib/utils/chat';

interface ProgressProps {
  /** Name of the file being downloaded */
  text: string;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Total file size in bytes (optional) */
  total?: number;
  /** Bytes loaded so far (optional) */
  loaded?: number;
  /** Custom className for styling */
  className?: string;
}

/**
 * Progress component for displaying model file download progress
 * Inspired by the Transformers.js examples but adapted for our chat system
 */
const Progress: React.FC<ProgressProps> = ({
  text,
  percentage = 0,
  total,
  loaded,
  className = '',
}) => {
  // Ensure percentage is within bounds
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  // Format the progress text
  const formatProgressText = () => {
    let progressText = `${text} (${clampedPercentage.toFixed(2)}%)`;

    if (total && !isNaN(total)) {
      progressText += ` of ${formatBytes(total)}`;
    } else if (loaded && !isNaN(loaded)) {
      progressText += ` - ${formatBytes(loaded)} loaded`;
    }

    return progressText;
  };

  return (
    <div className={`chat-progress-container ${className}`.trim()}>
      <div className="chat-progress-bar-wrapper">
        <div
          className="chat-progress-bar"
          style={{ width: `${clampedPercentage}%` }}
          role="progressbar"
          aria-valuenow={clampedPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Loading ${text}: ${clampedPercentage.toFixed(2)}% complete`}
        />
        <div className="chat-progress-text-overlay">
          <span className="chat-progress-text">{formatProgressText()}</span>
        </div>
      </div>
    </div>
  );
};

export default Progress;
