import React from 'react';
import { ExpertiseIcon, IconStyle, iconFrameProps } from './iconBase';

// The pipe is drawn twice: a dimmed solid run for the plumbing, and a dashed
// overlay on the same geometry whose dashes march one full pattern per cycle,
// which reads as flow without the line itself ever looking broken.
const css = `
.icn-dat-flow {
  stroke-dasharray: 5 9;
  animation: icn-dat-run 2.8s linear infinite;
}
@keyframes icn-dat-run {
  from { stroke-dashoffset: 14; }
  to { stroke-dashoffset: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .icn-dat-flow { animation: none; }
}
`;

const pipe = 'M11.5 21.5 V24 H21 M27 24 H36.5 V26.5';

const DataEngineeringIcon: ExpertiseIcon = ({ className }) => (
  <svg {...iconFrameProps} className={className}>
    <IconStyle css={css} />

    {/* source tank: collar, then the level it is drawn down to */}
    <rect x="4.5" y="5.5" width="14" height="16" />
    <path d="M4.5 9.5 H18.5" />
    <path d="M4.5 16.5 H18.5" />

    {/* the run between them, dimmed so the flow reads on top of it */}
    <path d={pipe} opacity="0.35" />
    <path className="icn-dat-flow" d={pipe} />

    {/* inline valve: two triangles meeting at the stem */}
    <path d="M21 21 L21 27 L24 24 Z" />
    <path d="M27 21 L27 27 L24 24 Z" />
    <path d="M24 24 V19.5" />
    <path d="M21.5 19.5 H26.5" />

    {/* destination tank, filling */}
    <rect x="29.5" y="26.5" width="14" height="16" />
    <path d="M29.5 30.5 H43.5" />
    <path d="M29.5 37.5 H43.5" />
  </svg>
);

export default DataEngineeringIcon;
