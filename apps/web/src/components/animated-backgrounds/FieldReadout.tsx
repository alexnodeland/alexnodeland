import React from 'react';
import { useReadout } from './core/stage/telemetry';

/**
 * What the simulation has to say for itself, beside the pill that names it.
 *
 * One quiet line on the bare field: a generation count climbing, a residual
 * falling, a frontier growing and collapsing. It is there to be glanced at —
 * the proof that what is behind the page is being computed and not played
 * back — and so it is drawn like a caption, not like a control.
 *
 * Hidden from assistive technology on purpose. It changes several times a
 * second and says nothing a reader could act on; announced, it would be a
 * voice that never stops counting.
 */
const FieldReadout: React.FC = () => {
  const line = useReadout();
  if (!line) return null;
  return (
    <span className="field-readout" aria-hidden="true">
      {line}
    </span>
  );
};

export default FieldReadout;
