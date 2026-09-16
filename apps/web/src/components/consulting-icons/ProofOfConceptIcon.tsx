import React from 'react';
import {
  ExpertiseIcon,
  IconStyle,
  iconFrameProps,
} from '../expertise-icons/iconBase';

// Step three, a quick proof of concept. A foundation with room marked out on
// it, and one small piece settling into place: small, but set on the base the
// rest will stand on. The piece arrives on an ease-out and leaves by fading
// where it sits, so it is never seen moving away. The baseplate and the
// dashed room on either side are the same geometry as the next step's icon,
// so the two read as one picture a step apart.
const css = `
.icn-poc-piece {
  animation: icn-poc-set 5s infinite;
}
@keyframes icn-poc-set {
  0% {
    opacity: 0;
    transform: translateY(-8px);
    animation-timing-function: cubic-bezier(0.15, 0.85, 0.35, 1);
  }
  30% { opacity: 1; transform: translateY(0); }
  80% {
    opacity: 1;
    transform: translateY(0);
    animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1);
  }
  94% { opacity: 0; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-8px); }
}
@media (prefers-reduced-motion: reduce) {
  .icn-poc-piece { animation: none; }
}
`;

const ProofOfConceptIcon: ExpertiseIcon = ({ className }) => (
  <svg {...iconFrameProps} className={className}>
    <IconStyle css={css} />

    {/* the foundation */}
    <rect x="5.5" y="29.5" width="37" height="6" />

    {/* room marked out beside the piece, for what comes after it */}
    <g opacity="0.35" strokeDasharray="2 2">
      <rect x="5.5" y="18.5" width="10" height="11" />
      <rect x="32.5" y="18.5" width="10" height="11" />
    </g>

    {/* the proof of concept itself */}
    <rect className="icn-poc-piece" x="18.5" y="18.5" width="11" height="11" />
  </svg>
);

export default ProofOfConceptIcon;
