import React from 'react';
import {
  ExpertiseIcon,
  IconStyle,
  iconFrameProps,
} from '../expertise-icons/iconBase';

// Step three, a quick proof of concept: a flask with something going on in it.
// Three bubbles rise through the liquid, each from its own place along the
// bottom, and fade out as they reach the surface. They stay under the surface
// line, where the flask is wide, so they never crowd each other or cross the
// line; staggered on one curve, one is always on its way up.
const css = `
.icn-flk-bubble {
  opacity: 0;
  animation: icn-flk-rise 2.7s cubic-bezier(0.33, 0, 0.67, 1) infinite;
}
.icn-flk-bubble-2 { animation-delay: 0.9s; }
.icn-flk-bubble-3 { animation-delay: 1.8s; }
@keyframes icn-flk-rise {
  0% { opacity: 0; transform: translateY(0); }
  25% { opacity: 1; }
  70% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-6.5px); }
}
@media (prefers-reduced-motion: reduce) {
  .icn-flk-bubble { animation: none; opacity: 1; transform: translateY(-3px); }
}
`;

const ProofOfConceptIcon: ExpertiseIcon = ({ className }) => (
  <svg {...iconFrameProps} className={className}>
    <IconStyle css={css} />

    {/* the flask: a lip, a straight neck, and a body that widens to a flat,
        softly cornered base */}
    <path d="M16.5 6.5 H31.5" />
    <path d="M19.5 6.5 V17.5 L8 37.5 Q6.5 41.5 10.5 41.5 H37.5 Q41.5 41.5 40 37.5 L28.5 17.5 V6.5" />

    {/* the liquid's surface, a little way up the body */}
    <path d="M13.5 29.5 H34.5" />

    {/* bubbles, spread along the bottom of the liquid */}
    <circle
      className="icn-flk-bubble icn-flk-bubble-1"
      cx="17"
      cy="38"
      r="1.5"
    />
    <circle
      className="icn-flk-bubble icn-flk-bubble-2"
      cx="31"
      cy="38"
      r="1.5"
    />
    <circle
      className="icn-flk-bubble icn-flk-bubble-3"
      cx="24"
      cy="38"
      r="1.5"
    />
  </svg>
);

export default ProofOfConceptIcon;
