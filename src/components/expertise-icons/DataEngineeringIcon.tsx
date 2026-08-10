import React from 'react';
import { ExpertiseIcon, IconStyle, iconFrameProps } from './iconBase';

// A dash-march is the one place a linear timing function is the right answer:
// the dashes have to travel at a constant rate, and the pattern repeats exactly
// once per cycle so the loop point is invisible.
const css = `
.icn-dat-flow {
  stroke-dasharray: 5 9;
  animation: icn-dat-run 3s linear infinite;
}
@keyframes icn-dat-run {
  from { stroke-dashoffset: 14; }
  to { stroke-dashoffset: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .icn-dat-flow { animation: none; }
}
`;

// One jog, source to sink: out of the upper store's side, across, down into the
// lower one's top.
const pipe = 'M20.5 15 H35 V23';

// Classic stacked-disc store: an ellipse for the top, straight sides, and a
// half-ellipse closing the bottom.
const store = (cx: number, top: number, rx: number, ry: number, h: number) =>
  `M${cx - rx} ${top} V${top + h} A${rx} ${ry} 0 0 0 ${cx + rx} ${
    top + h
  } V${top}`;

const DataEngineeringIcon: ExpertiseIcon = ({ className }) => (
  <svg {...iconFrameProps} className={className}>
    <IconStyle css={css} />

    {/* source store */}
    <ellipse cx="13" cy="9.5" rx="7.5" ry="3.5" />
    <path d={store(13, 9.5, 7.5, 3.5, 11)} />

    {/* the run between them, dimmed so the flow reads on top of it */}
    <path d={pipe} opacity="0.35" />
    <path className="icn-dat-flow" d={pipe} />

    {/* destination store */}
    <ellipse cx="35" cy="26.5" rx="7.5" ry="3.5" />
    <path d={store(35, 26.5, 7.5, 3.5, 11)} />
  </svg>
);

export default DataEngineeringIcon;
