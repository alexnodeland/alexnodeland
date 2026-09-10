import React from 'react';
import { ExpertiseIcon, IconStyle, iconFrameProps } from './iconBase';

// Six status pips on one 3.6s cycle, each offset by 600ms, so the rack reads as
// three modules reporting in turn rather than one blinking light. The dip sits
// in the middle of the cycle rather than at its edge — starting and ending the
// keyframe at full opacity is what keeps the restart from reading as a snap.
const css = `
.icn-inf-pip {
  animation: icn-inf-blink 3.6s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}
.icn-inf-pip-2 { animation-delay: 0.6s; }
.icn-inf-pip-3 { animation-delay: 1.2s; }
.icn-inf-pip-4 { animation-delay: 1.8s; }
.icn-inf-pip-5 { animation-delay: 2.4s; }
.icn-inf-pip-6 { animation-delay: 3s; }
@keyframes icn-inf-blink {
  0% { opacity: 1; }
  12% { opacity: 0.2; }
  26% { opacity: 1; }
  100% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .icn-inf-pip { animation: none; }
}
`;

interface RackModule {
  y: number;
  pipA: string;
  pipB: string;
}

const modules: RackModule[] = [
  { y: 8.5, pipA: 'icn-inf-pip-1', pipB: 'icn-inf-pip-2' },
  { y: 20.5, pipA: 'icn-inf-pip-3', pipB: 'icn-inf-pip-4' },
  { y: 32.5, pipA: 'icn-inf-pip-5', pipB: 'icn-inf-pip-6' },
];

const InfrastructureIcon: ExpertiseIcon = ({ className }) => (
  <svg {...iconFrameProps} className={className}>
    <IconStyle css={css} />

    {/* rack rails */}
    <path d="M6.5 6.5 V41.5" />
    <path d="M41.5 6.5 V41.5" />

    {modules.map(({ y, pipA, pipB }) => {
      const centre = y + 4.5;
      return (
        <React.Fragment key={y}>
          {/* mounting ears */}
          <path d={`M6.5 ${centre} H9.5`} />
          <path d={`M38.5 ${centre} H41.5`} />
          {/* module face, vent line, status pips */}
          <rect x="9.5" y={y} width="29" height="9" />
          <path d={`M12.5 ${centre} H23.5`} />
          <circle
            className={`icn-inf-pip ${pipA}`}
            cx="30.5"
            cy={centre}
            r="1.4"
            fill="currentColor"
            stroke="none"
          />
          <circle
            className={`icn-inf-pip ${pipB}`}
            cx="35"
            cy={centre}
            r="1.4"
            fill="currentColor"
            stroke="none"
          />
        </React.Fragment>
      );
    })}
  </svg>
);

export default InfrastructureIcon;
