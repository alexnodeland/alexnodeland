import { act, render, screen } from '@testing-library/react';
import React from 'react';
import {
  createReadout,
  formatCount,
  hushReadout,
  setReadout,
  useReadout,
} from '../../../../../../components/animated-backgrounds/core/stage/telemetry';

const Line: React.FC = () => <span data-testid="line">{useReadout()}</span>;

describe('the readout', () => {
  afterEach(() => {
    act(() => setReadout(''));
  });

  it('hands a line from an animation loop to whoever is reading', () => {
    render(<Line />);
    expect(screen.getByTestId('line')).toHaveTextContent('');
    act(() => setReadout('gen 12 · pop 340'));
    expect(screen.getByTestId('line')).toHaveTextContent('gen 12 · pop 340');
  });

  it('says nothing while hushed, and drops what it is told', () => {
    render(<Line />);
    act(() => setReadout('gen 12'));
    act(() => hushReadout(true));
    expect(screen.getByTestId('line')).toHaveTextContent('');
    act(() => setReadout('gen 13'));
    expect(screen.getByTestId('line')).toHaveTextContent('');

    act(() => hushReadout(false));
    act(() => setReadout('gen 14'));
    expect(screen.getByTestId('line')).toHaveTextContent('gen 14');
  });

  it('stops telling a reader who has gone', () => {
    const { unmount } = render(<Line />);
    unmount();
    expect(() => setReadout('still counting')).not.toThrow();
  });

  it('works a line out a few times a second, not every frame', () => {
    const readout = createReadout(240);
    const compose = jest.fn(() => 'line');
    readout.write(0, compose);
    // Fourteen frames inside the interval: asked, never answered.
    for (let now = 16; now < 240; now += 16) readout.write(now, compose);
    expect(compose).toHaveBeenCalledTimes(1);
    readout.write(240, compose);
    expect(compose).toHaveBeenCalledTimes(2);
  });

  it('takes its line down when the scene goes', () => {
    render(<Line />);
    const readout = createReadout();
    act(() => readout.write(0, () => 't 0.42'));
    expect(screen.getByTestId('line')).toHaveTextContent('t 0.42');
    act(() => readout.clear());
    expect(screen.getByTestId('line')).toHaveTextContent('');
  });

  it('sets a count in threes, a thin space apart', () => {
    expect(formatCount(7)).toBe('7');
    expect(formatCount(1234)).toBe('1\u2009234');
    expect(formatCount(1234567.4)).toBe('1\u2009234\u2009567');
  });
});
