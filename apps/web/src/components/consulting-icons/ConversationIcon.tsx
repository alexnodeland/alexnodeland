import React from 'react';
import {
  ExpertiseIcon,
  IconStyle,
  iconFrameProps,
} from '../expertise-icons/iconBase';

// Step one, a conversation. One side has said its piece; the other is
// answering, its three dots lighting in turn the way a reply does while it is
// being written. The dots share one curve and are staggered by delay, and each
// is back at rest before the next cycle starts, so the loop has no seam.
const css = `
.icn-cnv-dot {
  opacity: 0.28;
  animation: icn-cnv-type 2.4s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}
.icn-cnv-dot-2 { animation-delay: 0.3s; }
.icn-cnv-dot-3 { animation-delay: 0.6s; }
@keyframes icn-cnv-type {
  0% { opacity: 0.28; }
  25% { opacity: 1; }
  50% { opacity: 0.28; }
  100% { opacity: 0.28; }
}
@media (prefers-reduced-motion: reduce) {
  .icn-cnv-dot { animation: none; opacity: 1; }
}
`;

const ConversationIcon: ExpertiseIcon = ({ className }) => (
  <svg {...iconFrameProps} className={className}>
    <IconStyle css={css} />

    {/* what has been said: a bubble with its tail at the lower left, and two
        lines of it */}
    <path d="M5.5 8.5 H29.5 V23.5 H15.5 L10.5 28.5 V23.5 H5.5 Z" />
    <path d="M10.5 13.5 H24.5" />
    <path d="M10.5 18.5 H20.5" />

    {/* the answer, still being written: a bubble with its tail at the lower
        right, and the dots */}
    <path d="M18.5 25.5 H42.5 V39.5 H37.5 V43.5 L33.5 39.5 H18.5 Z" />
    <circle
      className="icn-cnv-dot icn-cnv-dot-1"
      cx="24.5"
      cy="32.5"
      r="1.6"
      fill="currentColor"
      stroke="none"
    />
    <circle
      className="icn-cnv-dot icn-cnv-dot-2"
      cx="30.5"
      cy="32.5"
      r="1.6"
      fill="currentColor"
      stroke="none"
    />
    <circle
      className="icn-cnv-dot icn-cnv-dot-3"
      cx="36.5"
      cy="32.5"
      r="1.6"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);

export default ConversationIcon;
