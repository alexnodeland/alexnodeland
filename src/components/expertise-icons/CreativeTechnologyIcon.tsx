import React from 'react';
import { ExpertiseIcon, IconStyle, iconFrameProps } from './iconBase';

// A whole patch in motion: the knob sweeps, the sine breathes through its
// phase, and both fader caps ride their tracks — each on its own period so
// the panel reads as running, not looping. Every curve is the symmetric
// sine-like ease (slowest at each end, the way a hand or an LFO actually
// moves), and reduced motion parks all four at their drawn positions.
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
.icn-cre-sine {
  animation: icn-cre-phase 4.5s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}
@keyframes icn-cre-phase {
  0% { transform: translateX(0); }
  50% { transform: translateX(-2px); }
  100% { transform: translateX(0); }
}
.icn-cre-fader-a {
  animation: icn-cre-ride-a 5s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}
@keyframes icn-cre-ride-a {
  0% { transform: translateY(0); }
  50% { transform: translateY(4px); }
  100% { transform: translateY(0); }
}
.icn-cre-fader-b {
  animation: icn-cre-ride-b 6.5s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}
@keyframes icn-cre-ride-b {
  0% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
  100% { transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .icn-cre-indicator,
  .icn-cre-sine,
  .icn-cre-fader-a,
  .icn-cre-fader-b {
    animation: none;
  }
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

    {/* sine squiggle, breathing through its phase */}
    <path
      className="icn-cre-sine"
      d="M27 16 q3 -5 6 0 t6 0"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* two faders — a track with a filled cap riding it. The caps travel
        their tracks on different periods, like two channels mid-mix. */}
    <path d="M17.5 26.5 V37.5" />
    <rect
      className="icn-cre-fader-a"
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
      className="icn-cre-fader-b"
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
