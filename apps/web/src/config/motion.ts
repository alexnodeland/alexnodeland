/**
 * The motion tokens' JavaScript twins. The stylesheet declares the durations
 * (`--duration-*` in src/styles/variables.scss) and the shell needs the same
 * numbers where CSS cannot reach: a panel's close waits for its slide to
 * finish before it unmounts, and the hero transition is driven by the Web
 * Animations API. Change these together with the stylesheet.
 */

/** `--duration-slow`: a panel sliding, the stage moving over, the hero. */
export const DURATION_SLOW_MS = 320;

/** `--duration-normal`: a disclosure or popover arriving. */
export const DURATION_NORMAL_MS = 240;

/** `--duration-fast`: a state change under the pointer. */
export const DURATION_FAST_MS = 120;

/** `--ease-out`: what arrives or settles. */
export const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';

/**
 * `--ease-in`: what leaves — EASE_OUT reflected, so the two halves of a swap
 * accelerate away exactly as hard as they decelerate in.
 */
export const EASE_IN = 'cubic-bezier(0.7, 0, 0.84, 0)';

/**
 * How long a panel's closing state is held before it unmounts: the slide's
 * own duration. One number for the chat and the settings panel.
 */
export const PANEL_TRANSITION_MS = DURATION_SLOW_MS;
