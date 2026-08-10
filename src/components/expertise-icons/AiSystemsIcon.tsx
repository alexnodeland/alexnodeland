import React from 'react';
import { ExpertiseIcon, IconStyle, iconFrameProps } from './iconBase';

// A single blip runs the routing path: three inputs converge on the junction,
// through the block, out the pin. pathLength normalises the two subpaths to 100
// units so the dash maths does not depend on the geometry.
const css = `
.icn-ai-signal {
  stroke-dasharray: 4 96;
  animation: icn-ai-travel 4.5s linear infinite;
}
@keyframes icn-ai-travel {
  from { stroke-dashoffset: 100; }
  to { stroke-dashoffset: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .icn-ai-signal { display: none; }
}
`;

const AiSystemsIcon: ExpertiseIcon = ({ className }) => (
  <svg {...iconFrameProps} className={className}>
    <IconStyle css={css} />

    {/* three input blocks */}
    <rect x="4.5" y="8.5" width="9" height="7" />
    <rect x="4.5" y="20.5" width="9" height="7" />
    <rect x="4.5" y="32.5" width="9" height="7" />

    {/* orthogonal routing into the junction, then one bus into the block */}
    <path d="M13.5 12 H19.5 V24 H24.5" />
    <path d="M13.5 24 H24.5" />
    <path d="M13.5 36 H19.5 V24 H24.5" />
    <circle cx="19.5" cy="24" r="1.6" fill="currentColor" stroke="none" />

    {/* the block that does the work */}
    <rect x="24.5" y="16.5" width="13" height="15" />
    <path d="M27.5 21.5 H34.5" />
    <path d="M27.5 26.5 H34.5" />

    {/* output line and pin */}
    <path d="M37.5 24 H43.5" />
    <path d="M43.5 20.5 V27.5" />

    <path
      className="icn-ai-signal"
      d="M13.5 12 H19.5 V24 H24.5 M37.5 24 H43.5"
      pathLength={100}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </svg>
);

export default AiSystemsIcon;
