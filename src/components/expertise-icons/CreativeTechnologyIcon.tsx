import React from 'react';
import { ExpertiseIcon, IconStyle, iconFrameProps } from './iconBase';

// The indicator rotates about the group's own origin, so transform-origin is
// pinned to 0 0 and the knob's position comes from the static translate on the
// wrapping group. The easing is a symmetric sine-like curve, which is what a
// hand on a knob actually does: slowest at each end of the sweep. With motion
// reduced the rotation drops out and the indicator simply points straight up.
const css = `
.icn-cre-indicator {
  transform-origin: 0 0;
  animation: icn-cre-sweep 6s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}
@keyframes icn-cre-sweep {
  0% { transform: rotate(-20deg); }
  50% { transform: rotate(20deg); }
  100% { transform: rotate(-20deg); }
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

    {/* the swept knob */}
    <circle cx="15.5" cy="16" r="6" />
    <g transform="translate(15.5 16)">
      <g className="icn-cre-indicator">
        <path d="M0 0 V-6" />
      </g>
    </g>

    {/* sine squiggle */}
    <path
      d="M27 16 q3 -5 6 0 t6 0"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* two faders — a track with a filled cap riding it. A full-width tick
        crossing the track read as a dagger, not a slider. */}
    <path d="M17.5 26.5 V37.5" />
    <rect
      x="15.25"
      y="29"
      width="4.5"
      height="3"
      rx="1"
      fill="currentColor"
      stroke="none"
    />
    <path d="M30.5 26.5 V37.5" />
    <rect
      x="28.25"
      y="33"
      width="4.5"
      height="3"
      rx="1"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);

export default CreativeTechnologyIcon;
