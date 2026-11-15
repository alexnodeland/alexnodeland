import React, { useEffect, useRef } from 'react';

/**
 * The light the pointer carries across the glass.
 *
 * Everything on the site is a sheet of frosted glass over a simulation, and
 * the simulations answer the pointer: a probe on the membrane, a ripple, a
 * cell stirred awake. This is the page's half of the same idea. A soft disc
 * of light follows the cursor and is blended into whatever is under it —
 * brightening what is already lit and leaving the dark alone — so a hairline
 * near the pointer catches it, the glow of the field under the window pools
 * a little, and text it passes over comes up a step. Over the bare field it
 * is put out: there the simulation's own answer is the light.
 *
 * One element, moved by transform from one passive listener, at most once a
 * frame. Nothing here writes a custom property, so no style is recalculated
 * as the pointer moves — the alternative (the pointer's position published
 * on the root for every card to read) would restyle the whole document on
 * every frame of every gesture.
 */
const PointerLight: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof window === 'undefined') return;

    let frame = 0;
    let x = 0;
    let y = 0;
    let lit = false;

    const draw = () => {
      frame = 0;
      element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const setLit = (next: boolean) => {
      if (lit === next) return;
      lit = next;
      element.classList.toggle('is-lit', next);
    };

    const onMove = (event: PointerEvent) => {
      // A finger is not a pointer that hovers: its light would be left
      // behind wherever it last lifted.
      if (event.pointerType === 'touch') {
        setLit(false);
        return;
      }
      x = event.clientX;
      y = event.clientY;
      setLit(true);
      if (!frame) frame = requestAnimationFrame(draw);
    };

    const onLeave = () => setLit(false);

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={ref} className="pointer-light" aria-hidden="true" />;
};

export default PointerLight;
