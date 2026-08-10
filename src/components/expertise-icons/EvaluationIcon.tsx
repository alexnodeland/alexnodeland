import React from 'react';
import { ExpertiseIcon, IconStyle, iconFrameProps } from './iconBase';

// The trace eases on left to right, holds long enough to be read, then eases
// off the same way. Both ends of the cycle put the whole dash outside the path,
// so the restart is invisible; the per-step timing functions keep the leading
// edge from arriving or leaving at a constant clip.
const css = `
.icn-obs-trace {
  stroke-dasharray: 100 100;
  animation: icn-obs-sweep 6s infinite;
}
@keyframes icn-obs-sweep {
  0% {
    stroke-dashoffset: 100;
    animation-timing-function: cubic-bezier(0.33, 0, 0.15, 1);
  }
  45% {
    stroke-dashoffset: 0;
    animation-timing-function: linear;
  }
  68% {
    stroke-dashoffset: 0;
    animation-timing-function: cubic-bezier(0.85, 0, 0.67, 1);
  }
  100% { stroke-dashoffset: -100; }
}
@media (prefers-reduced-motion: reduce) {
  .icn-obs-trace { animation: none; stroke-dashoffset: 0; }
}
`;

const EvaluationIcon: ExpertiseIcon = ({ className }) => (
  <svg {...iconFrameProps} className={className}>
    <IconStyle css={css} />

    {/* screen */}
    <rect x="5.5" y="8.5" width="37" height="28" />

    {/* three baseline ticks, enough to give the trace a floor to sit on */}
    <path d="M14.5 33.5 V35.5" />
    <path d="M24 33.5 V35.5" />
    <path d="M33.5 33.5 V35.5" />

    {/* trace */}
    <path
      className="icn-obs-trace"
      d="M8.5 28.5 H14.5 V16.5 H20.5 V28.5 H26.5 V19.5 H32.5 V28.5 H39.5"
      pathLength={100}
    />

    {/* bezel feet */}
    <path d="M14.5 36.5 V40.5" />
    <path d="M33.5 36.5 V40.5" />
    <path d="M11.5 40.5 H36.5" />
  </svg>
);

export default EvaluationIcon;
