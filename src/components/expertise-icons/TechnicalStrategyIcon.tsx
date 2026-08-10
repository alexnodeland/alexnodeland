import React from 'react';
import { ExpertiseIcon, IconStyle, iconFrameProps } from './iconBase';

// Attention moves between the branch that got built and the one that got cut.
// Each half of the connector belongs to the branch it leads to, so the bar
// lights up only as far as the side currently being weighed. The curve is a
// symmetric ease so the two states trade places without either end snapping.
const css = `
.icn-str-branch {
  animation: icn-str-weigh 6s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}
.icn-str-branch-b { animation-delay: -3s; }
@keyframes icn-str-weigh {
  0% { opacity: 1; }
  50% { opacity: 0.28; }
  100% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .icn-str-branch { animation: none; }
}
`;

const TechnicalStrategyIcon: ExpertiseIcon = ({ className }) => (
  <svg {...iconFrameProps} className={className}>
    <IconStyle css={css} />

    {/* root node and trunk */}
    <rect x="20" y="5.5" width="8" height="8" />
    <path d="M24 13.5 V19.5" />
    <circle cx="24" cy="19.5" r="1.6" fill="currentColor" stroke="none" />

    {/* left branch: its half of the connector, a decision node, a commitment */}
    <g className="icn-str-branch icn-str-branch-a">
      <path d="M24 19.5 H9.5 V25.5" />
      <rect x="6" y="25.5" width="7" height="7" />
      <path d="M9.5 32.5 V36" />
      <circle cx="9.5" cy="38.5" r="2.5" fill="currentColor" stroke="none" />
    </g>

    {/* right branch: its half of the connector, and the cut */}
    <g className="icn-str-branch icn-str-branch-b">
      <path d="M24 19.5 H38.5 V30.5" />
      <path d="M35.5 32.5 L41.5 38.5" />
      <path d="M41.5 32.5 L35.5 38.5" />
    </g>
  </svg>
);

export default TechnicalStrategyIcon;
