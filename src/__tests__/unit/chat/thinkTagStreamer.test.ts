import {
  createThinkTagFilter,
  isPartialTagPrefix,
} from '../../../components/chat/thinkTagStreamer';

/**
 * Feeds each chunk through the filter and collects the emitted segments,
 * then flushes. Returns the full segment list.
 */
function run(chunks: string[]) {
  const filter = createThinkTagFilter();
  const segments: Array<{ text: string; state: string }> = [];
  for (const c of chunks) {
    for (const seg of filter.push(c)) segments.push(seg);
  }
  for (const seg of filter.flush()) segments.push(seg);
  return segments;
}

/** Concatenates emitted text for a given state. */
function textFor(
  segments: Array<{ text: string; state: string }>,
  state: string
) {
  return segments
    .filter(s => s.state === state)
    .map(s => s.text)
    .join('');
}

describe('isPartialTagPrefix', () => {
  it('recognizes strict prefixes of the open tag', () => {
    ['<', '<t', '<th', '<thi', '<thin', '<think'].forEach(p =>
      expect(isPartialTagPrefix(p)).toBe(true)
    );
  });

  it('recognizes strict prefixes of the close tag', () => {
    ['</', '</t', '</think'].forEach(p =>
      expect(isPartialTagPrefix(p)).toBe(true)
    );
  });

  it('rejects complete tags and non-prefixes', () => {
    expect(isPartialTagPrefix('<think>')).toBe(false); // complete → handled elsewhere
    expect(isPartialTagPrefix('</think>')).toBe(false);
    expect(isPartialTagPrefix('<x')).toBe(false);
    expect(isPartialTagPrefix('hello')).toBe(false);
    expect(isPartialTagPrefix('')).toBe(false);
  });
});

describe('createThinkTagFilter', () => {
  it('passes through plain text with no tags as answering', () => {
    const segs = run(['Hello ', 'world']);
    expect(textFor(segs, 'answering')).toBe('Hello world');
    expect(textFor(segs, 'thinking')).toBe('');
  });

  it('strips a complete think block delivered in one chunk', () => {
    const segs = run(['<think>reasoning</think>answer']);
    expect(textFor(segs, 'thinking')).toBe('reasoning');
    expect(textFor(segs, 'answering')).toBe('answer');
  });

  it('handles an open tag split across chunk boundaries', () => {
    // "<think>" split as "<thi" + "nk>"
    const segs = run(['before <thi', 'nk>reason', 'ing</think>done']);
    expect(textFor(segs, 'answering')).toBe('before done');
    expect(textFor(segs, 'thinking')).toBe('reasoning');
  });

  it('handles a close tag split across chunk boundaries', () => {
    // "</think>" split as "</thi" + "nk>"
    const segs = run(['<think>abc</thi', 'nk>xyz']);
    expect(textFor(segs, 'thinking')).toBe('abc');
    expect(textFor(segs, 'answering')).toBe('xyz');
  });

  it('handles a tag split one character at a time', () => {
    const chunks = '<think>hi</think>bye'.split('');
    const segs = run(chunks);
    expect(textFor(segs, 'thinking')).toBe('hi');
    expect(textFor(segs, 'answering')).toBe('bye');
  });

  it('never leaks tag fragments into output', () => {
    const segs = run(['x<thi', 'nk>y</thin', 'k>z']);
    const all = segs.map(s => s.text).join('');
    expect(all).not.toContain('<think>');
    expect(all).not.toContain('</think>');
    expect(all).not.toContain('<thi');
    expect(all).not.toContain('</thin');
  });

  it('does not mistake real "<" text for a tag', () => {
    const segs = run(['a < b < c']);
    expect(textFor(segs, 'answering')).toBe('a < b < c');
  });

  it('releases a held partial that turns out to be normal text', () => {
    // "<thing>" starts like "<think" but is not the tag
    const segs = run(['value <thing> end']);
    expect(textFor(segs, 'answering')).toBe('value <thing> end');
  });

  it('drops a trailing incomplete tag fragment on flush', () => {
    // Stream ends mid-open-tag; the fragment must not leak
    const segs = run(['answer text <thi']);
    expect(textFor(segs, 'answering')).toBe('answer text ');
    expect(segs.map(s => s.text).join('')).not.toContain('<thi');
  });

  it('tracks multiple think blocks in one stream', () => {
    const segs = run(['<think>a</think>X<think>b</think>Y']);
    expect(textFor(segs, 'thinking')).toBe('ab');
    expect(textFor(segs, 'answering')).toBe('XY');
  });
});
