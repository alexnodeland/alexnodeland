// Streaming <think>/</think> tag filter.
//
// The model streams text in arbitrary chunks; a `<think>` or `</think>` tag can
// be split across chunk boundaries (e.g. "...<thi" then "nk>..."). A naive
// per-chunk `replace` leaks tag fragments and mis-tracks the thinking/answering
// state. This filter buffers text, holds back only a possible partial-tag
// suffix at the tail, strips complete tags, and reports the current state for
// every emitted segment — independent of how the stream was chunked.
//
// Pure and framework-free so it can be unit-tested in isolation and imported by
// the web worker.

const OPEN_TAG = '<think>';
const CLOSE_TAG = '</think>';
const MAX_TAG_LEN = Math.max(OPEN_TAG.length, CLOSE_TAG.length);

/**
 * True when `s` is a non-empty strict prefix of either tag — i.e. it could
 * still grow into a complete tag on the next chunk, so it must be held back.
 * A string as long as a full tag is never "partial" (a complete tag is handled
 * by findTag instead), which also caps how much text we ever withhold.
 */
export function isPartialTagPrefix(s) {
  if (!s || s.length >= MAX_TAG_LEN) return false;
  return (
    (s.length < OPEN_TAG.length && OPEN_TAG.startsWith(s)) ||
    (s.length < CLOSE_TAG.length && CLOSE_TAG.startsWith(s))
  );
}

/**
 * Finds the earliest complete tag in `buffer`.
 * @returns {{ index: number, tag: string, opens: boolean } | null}
 */
function findTag(buffer) {
  const oi = buffer.indexOf(OPEN_TAG);
  const ci = buffer.indexOf(CLOSE_TAG);
  if (oi === -1 && ci === -1) return null;
  if (oi === -1) return { index: ci, tag: CLOSE_TAG, opens: false };
  if (ci === -1) return { index: oi, tag: OPEN_TAG, opens: true };
  return oi <= ci
    ? { index: oi, tag: OPEN_TAG, opens: true }
    : { index: ci, tag: CLOSE_TAG, opens: false };
}

/**
 * Creates a stateful streaming filter.
 *
 * `push(chunk)` returns an array of `{ text, state }` segments where `state` is
 * either 'thinking' or 'answering' and `text` has all complete tags stripped.
 * `flush()` emits any buffered remainder at end-of-stream, dropping a trailing
 * incomplete tag fragment.
 */
export function createThinkTagFilter() {
  let buffer = '';
  let state = 'answering';

  function drain(final) {
    const segments = [];

    // Emit everything up to each complete tag, flipping state as we cross tags.
    for (;;) {
      const found = findTag(buffer);
      if (!found) break;
      const before = buffer.slice(0, found.index);
      if (before) segments.push({ text: before, state });
      state = found.opens ? 'thinking' : 'answering';
      buffer = buffer.slice(found.index + found.tag.length);
    }

    // Buffer now contains no complete tag.
    const lastLt = buffer.lastIndexOf('<');
    const tailIsPartial =
      lastLt !== -1 && isPartialTagPrefix(buffer.slice(lastLt));

    if (final) {
      // Drop a trailing incomplete tag fragment; emit any real text before it.
      const emit = tailIsPartial ? buffer.slice(0, lastLt) : buffer;
      if (emit) segments.push({ text: emit, state });
      buffer = '';
      return segments;
    }

    if (tailIsPartial) {
      const emit = buffer.slice(0, lastLt);
      if (emit) segments.push({ text: emit, state });
      buffer = buffer.slice(lastLt);
    } else {
      if (buffer) segments.push({ text: buffer, state });
      buffer = '';
    }
    return segments;
  }

  return {
    push(chunk) {
      if (chunk) buffer += chunk;
      return drain(false);
    },
    flush() {
      return drain(true);
    },
    getState() {
      return state;
    },
  };
}
