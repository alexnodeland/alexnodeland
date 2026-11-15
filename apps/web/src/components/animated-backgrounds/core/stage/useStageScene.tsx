import React, { useEffect, useRef } from 'react';
import { AnimatedBackgroundProps, StandardSettings } from '../types';
import { createStage, Frame, Stage, StageOptions } from './stage';

/**
 * What a background's component is, now that the stage does the standing up
 * and the tearing down: a function that builds a scene and answers a frame.
 *
 * `build` is handed the stage and three live readers — the settings, the 404
 * flag and the still flag — because the loop it starts outlives the render
 * that started it, and a value captured then would be a value frozen then.
 * Its `deps` are the structural settings only: the ones that change what is
 * built rather than how it is drawn. Everything else a scene reads per frame
 * off `settings()`, so dragging a slider never tears a simulation down.
 */
export interface SceneContext<TSettings> {
  stage: Stage;
  settings: () => TSettings;
  /** Whether the 404 sequence is being asked for. */
  notFound: () => boolean;
  /** Whether the scene is a still. */
  frozen: () => boolean;
}

export interface SceneHandle {
  update: (frame: Frame) => void;
  resize?: () => void;
  dispose: () => void;
}

export function useStageScene<TSettings extends StandardSettings>(
  props: AnimatedBackgroundProps<TSettings>,
  options: (settings: TSettings) => StageOptions,
  build: (context: SceneContext<TSettings>) => SceneHandle,
  deps: React.DependencyList
): React.RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Stage | null>(null);

  const settingsRef = useRef(props.settings);
  settingsRef.current = props.settings;
  const notFoundRef = useRef(Boolean(props.notFound));
  notFoundRef.current = Boolean(props.notFound);
  const frozenRef = useRef(Boolean(props.frozen));
  frozenRef.current = Boolean(props.frozen);
  // How long the scene has been given to go, in ms; 0 while it is staying.
  const leaveRef = useRef(0);
  leaveRef.current = props.leaving ? Math.max(1, props.leaveMs ?? 1000) : 0;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let stage: Stage | null = null;
    let handle: SceneHandle | null = null;
    try {
      stage = createStage(container, options(settingsRef.current));
      handle = build({
        stage,
        settings: () => settingsRef.current,
        notFound: () => notFoundRef.current,
        frozen: () => frozenRef.current,
      });
      const scene = handle;
      stage.setFrozen(frozenRef.current);
      if (leaveRef.current > 0) stage.leave(leaveRef.current / 1000);
      stage.start(
        frame => scene.update(frame),
        () => scene.resize?.()
      );
      stageRef.current = stage;
    } catch (error) {
      // No WebGL, a context the browser would not hand over, a driver that
      // rejected a shader: the field stays the flat ground it is composited
      // on, and the page above it is untouched. A background is decoration;
      // it is never allowed to be the reason a page does not render.
      console.warn('The background could not start:', error);
      handle?.dispose();
      stage?.dispose();
      stage = null;
      handle = null;
    }

    return () => {
      stageRef.current = null;
      handle?.dispose();
      stage?.dispose();
    };
    // The caller's structural settings, by design — see the note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Draw one frame and hold — see AnimatedBackgroundProps.frozen.
  useEffect(() => {
    stageRef.current?.setFrozen(Boolean(props.frozen));
  }, [props.frozen]);

  // Asked to go, or told it can stay after all. The stage runs the movement;
  // BackgroundManager takes the scene away when it is over.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (props.leaving) stage.leave(leaveRef.current / 1000);
    else stage.stay();
  }, [props.leaving]);

  // A still has no next frame to pick a change up in, so anything that
  // changes what it shows asks for one: the 404 coming or going, a setting
  // moved in the panel.
  useEffect(() => {
    stageRef.current?.requestFrame();
  }, [props.notFound, props.settings]);

  return containerRef;
}

interface StageSurfaceProps {
  className?: string;
  opacity: number;
  children?: React.ReactNode;
}

/**
 * The layer a scene's canvas goes into: the whole viewport, under everything,
 * blind to the pointer (the pointer is read from the window — see
 * pointer.ts), and worn at the background's own opacity.
 */
export const StageSurface = React.forwardRef<HTMLDivElement, StageSurfaceProps>(
  function StageSurface({ className, opacity, children }, ref) {
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={className}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1,
          pointerEvents: 'none',
          opacity,
        }}
      >
        {children}
      </div>
    );
  }
);
