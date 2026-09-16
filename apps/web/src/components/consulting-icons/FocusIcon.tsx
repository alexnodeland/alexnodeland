import React from 'react';
import {
  ExpertiseIcon,
  IconStyle,
  iconFrameProps,
} from '../expertise-icons/iconBase';

// Step two, deciding what to address. A grid of everything there is, and a
// viewfinder that looks at a couple of cells before settling on the one that
// is actually painful — already marked — and staying there long enough to be
// read. The return to the start is eased like every other move, and starts
// from rest, so it reads as looking again rather than as a reset.
const css = `
.icn-fcs-finder {
  animation: icn-fcs-look 7s infinite;
}
@keyframes icn-fcs-look {
  0% {
    transform: translate(0, 0);
    animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1);
  }
  18% {
    transform: translate(11px, 22px);
    animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1);
  }
  36% {
    transform: translate(22px, 11px);
    animation-timing-function: linear;
  }
  82% {
    transform: translate(22px, 11px);
    animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1);
  }
  100% { transform: translate(0, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .icn-fcs-finder { animation: none; transform: translate(22px, 11px); }
}
`;

const FocusIcon: ExpertiseIcon = ({ className }) => (
  <svg {...iconFrameProps} className={className}>
    <IconStyle css={css} />

    {/* the grid: its frame, and the lines between cells dimmed so the
        viewfinder reads on top of them */}
    <rect x="7.5" y="7.5" width="33" height="33" />
    <g opacity="0.35">
      <path d="M18.5 7.5 V40.5" />
      <path d="M29.5 7.5 V40.5" />
      <path d="M7.5 18.5 H40.5" />
      <path d="M7.5 29.5 H40.5" />
    </g>

    {/* the one that matters */}
    <rect
      x="32"
      y="21"
      width="6"
      height="6"
      fill="currentColor"
      stroke="none"
    />

    {/* the viewfinder: four corner marks around the top-left cell, moved from
        cell to cell by whole cell widths */}
    <g className="icn-fcs-finder">
      <path d="M5.5 8.5 V5.5 H8.5" />
      <path d="M17.5 5.5 H20.5 V8.5" />
      <path d="M20.5 17.5 V20.5 H17.5" />
      <path d="M8.5 20.5 H5.5 V17.5" />
    </g>
  </svg>
);

export default FocusIcon;
