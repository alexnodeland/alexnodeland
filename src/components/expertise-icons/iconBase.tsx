import React from 'react';

export interface ExpertiseIconProps {
  className?: string;
}

export type ExpertiseIcon = React.FC<ExpertiseIconProps>;

/**
 * One frame and one stroke language for the whole set: a 48-unit square, a
 * 1.5-unit stroke that never rounds off, and colour inherited from CSS so the
 * icons stay whatever the surface says text should be. Geometry in each icon is
 * laid out on the half-unit grid so the strokes land on pixel boundaries.
 *
 * The icons are decorative: each card already prints its title directly beneath
 * the icon, so the svg is hidden from assistive tech rather than repeating that
 * title as a label.
 */
export const iconFrameProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 48 48',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'square',
  strokeLinejoin: 'miter',
  'aria-hidden': true,
  focusable: 'false',
} as const;

/**
 * Scoped keyframes travel with the icon that uses them. Written through
 * dangerouslySetInnerHTML rather than as a text child so the server-rendered
 * markup is byte-identical to the client's and nothing in the css gets
 * html-escaped on the way out.
 */
export const IconStyle: React.FC<{ css: string }> = ({ css }) => (
  <style dangerouslySetInnerHTML={{ __html: css }} />
);
