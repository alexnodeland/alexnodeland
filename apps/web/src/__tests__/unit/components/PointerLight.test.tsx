import { act, render } from '@testing-library/react';
import PointerLight from '../../../components/ui/PointerLight';

const move = (
  init: { x: number; y: number; pointerType?: string },
  target: EventTarget = window
) => {
  const event = new MouseEvent('pointermove', {
    bubbles: true,
    clientX: init.x,
    clientY: init.y,
  });
  Object.defineProperty(event, 'pointerType', {
    value: init.pointerType ?? 'mouse',
  });
  target.dispatchEvent(event);
};

// The light is placed at most once a frame.
const frame = () =>
  act(async () => {
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)));
  });

describe('the light the pointer carries', () => {
  const light = (container: HTMLElement) =>
    container.querySelector('.pointer-light') as HTMLElement;

  it('is one element, out until a pointer arrives, and nothing to a screen reader', () => {
    const { container } = render(<PointerLight />);
    expect(container.querySelectorAll('.pointer-light')).toHaveLength(1);
    expect(light(container)).toHaveAttribute('aria-hidden', 'true');
    expect(light(container)).not.toHaveClass('is-lit');
  });

  it('comes on under a mouse and follows it by transform', async () => {
    const { container } = render(<PointerLight />);
    move({ x: 320, y: 140 });
    await frame();
    expect(light(container)).toHaveClass('is-lit');
    expect(light(container).style.transform).toBe(
      'translate3d(320px, 140px, 0)'
    );

    move({ x: 500, y: 90 });
    await frame();
    expect(light(container).style.transform).toBe(
      'translate3d(500px, 90px, 0)'
    );
  });

  it('writes the last place of a burst of moves, once', async () => {
    const { container } = render(<PointerLight />);
    const element = light(container);
    const writes: string[] = [];
    const style = element.style;
    Object.defineProperty(element, 'style', {
      configurable: true,
      value: new Proxy(style, {
        set(target, property, value) {
          if (property === 'transform') writes.push(String(value));
          return Reflect.set(target, property, value);
        },
      }),
    });

    for (let x = 0; x <= 100; x += 10) move({ x, y: 10 });
    await frame();
    expect(writes).toEqual(['translate3d(100px, 10px, 0)']);
  });

  it('goes out when the pointer leaves the page or the window loses focus', async () => {
    const { container } = render(<PointerLight />);
    move({ x: 10, y: 10 });
    await frame();
    act(() => {
      document.documentElement.dispatchEvent(new Event('pointerleave'));
    });
    expect(light(container)).not.toHaveClass('is-lit');

    move({ x: 10, y: 10 });
    expect(light(container)).toHaveClass('is-lit');
    act(() => {
      window.dispatchEvent(new Event('blur'));
    });
    expect(light(container)).not.toHaveClass('is-lit');
  });

  it('is not left behind by a finger, which does not hover', async () => {
    const { container } = render(<PointerLight />);
    move({ x: 10, y: 10 });
    await frame();
    move({ x: 200, y: 200, pointerType: 'touch' });
    await frame();
    expect(light(container)).not.toHaveClass('is-lit');
    // And it did not follow the finger there.
    expect(light(container).style.transform).toBe('translate3d(10px, 10px, 0)');
  });

  it('stops listening when it is taken down', async () => {
    const { container, unmount } = render(<PointerLight />);
    const element = light(container);
    unmount();
    move({ x: 300, y: 300 });
    await frame();
    expect(element).not.toHaveClass('is-lit');
    expect(element.style.transform).toBe('');
  });
});
