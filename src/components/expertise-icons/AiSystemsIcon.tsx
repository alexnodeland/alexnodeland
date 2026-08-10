import React from 'react';
import { ExpertiseIcon, IconStyle, iconFrameProps } from './iconBase';

// Activation sweeps left to right: input nodes, their edges, the hidden layer,
// its edges, the outputs — one 5s curve per group, each starting 450ms after
// the one feeding it. Every group rests at the same opacity it starts and ends
// the keyframe on, so the loop closes on itself with nothing to pop.
const css = `
.icn-ai-fire {
  opacity: 0.6;
  animation: icn-ai-pulse 5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
.icn-ai-edges-1 { animation-delay: 0.45s; }
.icn-ai-nodes-2 { animation-delay: 0.9s; }
.icn-ai-edges-2 { animation-delay: 1.35s; }
.icn-ai-nodes-3 { animation-delay: 1.8s; }
@keyframes icn-ai-pulse {
  0% { opacity: 0.6; }
  14% { opacity: 1; }
  38% { opacity: 0.6; }
  100% { opacity: 0.6; }
}
@media (prefers-reduced-motion: reduce) {
  .icn-ai-fire { animation: none; opacity: 1; }
}
`;

const NODE_R = 2.75;
const X_INPUT = 9.5;
const X_HIDDEN = 24;
const X_OUTPUT = 38.5;
const INPUT_Y = [14, 24, 34];
const HIDDEN_Y = [10.5, 19.5, 28.5, 37.5];
const OUTPUT_Y = [19, 29];

// Edges stop at the node rim rather than running under it, so the circles stay
// readable at 64px and the diagram keeps its drawn-by-hand look.
const round = (n: number): string => Number(n.toFixed(2)).toString();

const edge = (x1: number, y1: number, x2: number, y2: number): string => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const ux = (dx / len) * NODE_R;
  const uy = (dy / len) * NODE_R;
  return `M${round(x1 + ux)} ${round(y1 + uy)} L${round(x2 - ux)} ${round(
    y2 - uy
  )}`;
};

const fan = (xa: number, ysa: number[], xb: number, ysb: number[]): string =>
  ysa.map(ya => ysb.map(yb => edge(xa, ya, xb, yb)).join(' ')).join(' ');

const AiSystemsIcon: ExpertiseIcon = ({ className }) => (
  <svg {...iconFrameProps} className={className}>
    <IconStyle css={css} />

    <path
      className="icn-ai-fire icn-ai-edges-1"
      d={fan(X_INPUT, INPUT_Y, X_HIDDEN, HIDDEN_Y)}
      strokeWidth={0.75}
    />
    <path
      className="icn-ai-fire icn-ai-edges-2"
      d={fan(X_HIDDEN, HIDDEN_Y, X_OUTPUT, OUTPUT_Y)}
      strokeWidth={0.75}
    />

    <g className="icn-ai-fire icn-ai-nodes-1">
      {INPUT_Y.map(y => (
        <circle key={y} cx={X_INPUT} cy={y} r={NODE_R} />
      ))}
    </g>
    <g className="icn-ai-fire icn-ai-nodes-2">
      {HIDDEN_Y.map(y => (
        <circle key={y} cx={X_HIDDEN} cy={y} r={NODE_R} />
      ))}
    </g>
    <g className="icn-ai-fire icn-ai-nodes-3">
      {OUTPUT_Y.map(y => (
        <circle key={y} cx={X_OUTPUT} cy={y} r={NODE_R} />
      ))}
    </g>
  </svg>
);

export default AiSystemsIcon;
