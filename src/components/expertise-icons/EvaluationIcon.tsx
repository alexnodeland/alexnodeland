import React from 'react';
import { ExpertiseIcon, IconStyle, iconFrameProps } from './iconBase';

// The trace sweeps on left to right, holds while it is readable, then sweeps
// off the same way — one dash the length of the whole path, walked twice.
const css = `
.icn-obs-trace {
  stroke-dasharray: 100 100;
  animation: icn-obs-sweep 5.5s ease-in-out infinite;
}
@keyframes icn-obs-sweep {
  0% { stroke-dashoffset: 100; }
  45% { stroke-dashoffset: 0; }
  70% { stroke-dashoffset: 0; }
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

    {/* graticule: ticks along the two centre axes */}
    <path d="M13.5 21 V25" />
    <path d="M18.5 21 V25" />
    <path d="M29.5 21 V25" />
    <path d="M34.5 21 V25" />
    <path d="M22 13.5 H26" />
    <path d="M22 18.5 H26" />
    <path d="M22 27.5 H26" />
    <path d="M22 32.5 H26" />

    {/* trace */}
    <path
      className="icn-obs-trace"
      d="M8.5 29.5 H14.5 V17.5 H20.5 V29.5 H26.5 V20.5 H32.5 V29.5 H39.5"
      pathLength={100}
    />

    {/* bezel feet */}
    <path d="M14.5 36.5 V40.5" />
    <path d="M33.5 36.5 V40.5" />
    <path d="M11.5 40.5 H36.5" />
  </svg>
);

export default EvaluationIcon;
