import React from 'react';
import {
  ExpertiseIcon,
  IconStyle,
  iconFrameProps,
} from '../expertise-icons/iconBase';

// Step four, then, if it helps: a staircase going up, one step at a time. The
// first step is always there — the proof of concept — and the rest rise into
// place on their own beats, left to right, until a flag goes up on the top one.
// Everything holds together for a moment, then the added steps fade where they
// stand, leaving the first step to be built on again.
const settle = (name: string, start: number, arrive: number) => `
@keyframes ${name} {
  0%, ${start}% {
    opacity: 0;
    transform: translateY(5px);
    animation-timing-function: cubic-bezier(0.15, 0.85, 0.35, 1);
  }
  ${arrive}% { opacity: 1; transform: translateY(0); }
  80% {
    opacity: 1;
    transform: translateY(0);
    animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1);
  }
  92% { opacity: 0; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(5px); }
}`;

const css = `
.icn-stp-2 { animation: icn-stp-2 7s infinite; }
.icn-stp-3 { animation: icn-stp-3 7s infinite; }
.icn-stp-4 { animation: icn-stp-4 7s infinite; }
.icn-stp-flag { animation: icn-stp-flag 7s infinite; }
${settle('icn-stp-2', 4, 18)}
${settle('icn-stp-3', 16, 30)}
${settle('icn-stp-4', 28, 42)}
${settle('icn-stp-flag', 42, 54)}
@media (prefers-reduced-motion: reduce) {
  .icn-stp-2, .icn-stp-3, .icn-stp-4, .icn-stp-flag { animation: none; }
}
`;

// Four steps on one baseline, each one step wider to the right and one rise
// taller than the last.
const BASE = 42.5;
const WIDTH = 9;
const RISE = 8;
const stepX = (i: number) => 6.5 + i * WIDTH;
const stepTop = (i: number) => BASE - (i + 1) * RISE;

const BuildOnIcon: ExpertiseIcon = ({ className }) => (
  <svg {...iconFrameProps} className={className}>
    <IconStyle css={css} />

    {/* the first step: the proof of concept, always standing */}
    <rect x={stepX(0)} y={stepTop(0)} width={WIDTH} height={RISE} />

    {/* the steps built on it */}
    {[1, 2, 3].map(i => (
      <rect
        key={i}
        className={`icn-stp-${i + 1}`}
        x={stepX(i)}
        y={stepTop(i)}
        width={WIDTH}
        height={BASE - stepTop(i)}
      />
    ))}

    {/* and a flag on the top one */}
    <g className="icn-stp-flag">
      <path d={`M${stepX(3) + 4.5} ${stepTop(3)} V3.5`} />
      <path
        d={`M${stepX(3) + 4.5} 3.5 L${stepX(3) + 10.5} 5.75 L${stepX(3) + 4.5} 8`}
        fill="currentColor"
        stroke="none"
      />
    </g>
  </svg>
);

export default BuildOnIcon;
