import React from 'react';
import {
  ExpertiseIcon,
  IconStyle,
  iconFrameProps,
} from '../expertise-icons/iconBase';

// Step four, then, if it helps. The same foundation and the same first piece
// as the proof-of-concept icon, now standing, and the rest of the structure
// going up on it: the two pieces the last step marked out, then one across
// the top. Each piece settles in on its own beat, they hold together, and they
// fade in place together, leaving the proof of concept where it was.
const settle = (name: string, start: number, arrive: number) => `
@keyframes ${name} {
  0%, ${start}% {
    opacity: 0;
    transform: translateY(-6px);
    animation-timing-function: cubic-bezier(0.15, 0.85, 0.35, 1);
  }
  ${arrive}% { opacity: 1; transform: translateY(0); }
  78% {
    opacity: 1;
    transform: translateY(0);
    animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1);
  }
  92% { opacity: 0; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-6px); }
}`;

const css = `
.icn-bld-left { animation: icn-bld-left 7s infinite; }
.icn-bld-right { animation: icn-bld-right 7s infinite; }
.icn-bld-top { animation: icn-bld-top 7s infinite; }
${settle('icn-bld-left', 4, 20)}
${settle('icn-bld-right', 18, 34)}
${settle('icn-bld-top', 32, 50)}
@media (prefers-reduced-motion: reduce) {
  .icn-bld-left, .icn-bld-right, .icn-bld-top { animation: none; }
}
`;

const BuildOnIcon: ExpertiseIcon = ({ className }) => (
  <svg {...iconFrameProps} className={className}>
    <IconStyle css={css} />

    {/* the foundation, and the proof of concept already on it */}
    <rect x="5.5" y="29.5" width="37" height="6" />
    <rect x="18.5" y="18.5" width="11" height="11" />

    {/* what gets built on it, in the room the last step marked out */}
    <rect className="icn-bld-left" x="5.5" y="18.5" width="10" height="11" />
    <rect className="icn-bld-right" x="32.5" y="18.5" width="10" height="11" />
    <rect className="icn-bld-top" x="11.5" y="7.5" width="25" height="11" />
  </svg>
);

export default BuildOnIcon;
