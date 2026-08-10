import React from 'react';
import { ExpertiseIcon, IconStyle, iconFrameProps } from './iconBase';

// The indicator rotates about the group's own origin, so transform-origin is
// pinned to 0 0 and the knob's position comes from the static translate on the
// wrapping group. With motion reduced the rotation drops out and the indicator
// simply points straight up.
const css = `
.icn-cre-indicator {
  transform-origin: 0 0;
  animation: icn-cre-sweep 5s ease-in-out infinite;
}
@keyframes icn-cre-sweep {
  0%, 100% { transform: rotate(-18deg); }
  50% { transform: rotate(18deg); }
}
@media (prefers-reduced-motion: reduce) {
  .icn-cre-indicator { animation: none; }
}
`;

const CreativeTechnologyIcon: ExpertiseIcon = ({ className }) => (
  <svg {...iconFrameProps} className={className}>
    <IconStyle css={css} />

    {/* panel */}
    <rect x="6.5" y="5.5" width="35" height="37" />
    <path d="M6.5 20.5 H41.5" />

    {/* swept knob */}
    <circle cx="14.5" cy="13" r="4.5" />
    <g transform="translate(14.5 13)">
      <g className="icn-cre-indicator">
        <path d="M0 0 V-4.5" />
      </g>
    </g>

    {/* fixed knob */}
    <circle cx="25.5" cy="13" r="4.5" />
    <path d="M25.5 13 L28.7 9.8" />

    {/* sine squiggle */}
    <path
      d="M32.5 13 q2 -3.5 4 0 t4 0"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* fader bank */}
    <path d="M13.5 25.5 V38.5" />
    <path d="M20.5 25.5 V38.5" />
    <path d="M27.5 25.5 V38.5" />
    <path d="M11 31.5 H16" />
    <path d="M18 35 H23" />
    <path d="M25 28.5 H30" />

    {/* output jack */}
    <circle cx="36" cy="33" r="3" />
    <circle cx="36" cy="33" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export default CreativeTechnologyIcon;
