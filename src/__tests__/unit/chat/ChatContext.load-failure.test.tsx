import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { ChatProvider, useChat } from '../../../components/chat/ChatContext';

/**
 * A load failure must not write a message, and a generation failure must.
 *
 * This distinction had no test, and getting it wrong was invisible: the error
 * handler wrote "I ran into an error while generating the response" into the
 * message list for *both* cases, and because the model-error notice only
 * renders while `messages` is empty, that message hid the one piece of UI built
 * to report a failed load. The chat went quiet — disabled input, no
 * explanation, nothing in the console — and it took a twenty-minute browser
 * probe against the WASM backend to find out the worker had reported the error
 * correctly all along.
 *
 * Both branches are asserted here because fixing one by breaking the other is
 * the obvious wrong repair.
 */

/** Minimal stand-in for the chat worker: records what it was sent, and lets a
 *  test push messages back as the real worker would. */
class FakeWorker {
  static instances: FakeWorker[] = [];
  posted: unknown[] = [];
  private listeners = new Map<string, Set<(e: unknown) => void>>();

  constructor() {
    FakeWorker.instances.push(this);
  }

  addEventListener(type: string, fn: (e: unknown) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(fn);
  }

  removeEventListener(type: string, fn: (e: unknown) => void) {
    this.listeners.get(type)?.delete(fn);
  }

  postMessage(msg: unknown) {
    this.posted.push(msg);
  }

  terminate() {}

  /** Deliver a worker->main message, flushing effects like the real thing. */
  emit(data: unknown) {
    act(() => {
      this.listeners.get('message')?.forEach(fn => fn({ data }));
    });
  }
}

const Probe: React.FC = () => {
  const { modelState, messages } = useChat();
  return (
    <div>
      <span data-testid="status">{modelState?.status}</span>
      <span data-testid="error">{modelState?.error ?? ''}</span>
      <span data-testid="count">{messages.length}</span>
    </div>
  );
};

const KERNEL_ERROR =
  "Could not find an implementation for GatherBlockQuantized(1) node with name '/model/embed_tokens/Gather_Quant'";

describe('ChatContext worker error handling', () => {
  let originalWorker: typeof Worker | undefined;

  beforeEach(() => {
    FakeWorker.instances = [];
    originalWorker = (window as any).Worker;
    (window as any).Worker = FakeWorker as unknown as typeof Worker;
    window.sessionStorage.clear();
  });

  afterEach(() => {
    (window as any).Worker = originalWorker as typeof Worker;
  });

  const mount = () => {
    render(
      <ChatProvider>
        <Probe />
      </ChatProvider>
    );
    const worker = FakeWorker.instances[0];
    expect(worker).toBeDefined();
    return worker;
  };

  it('surfaces a load failure without writing a message', () => {
    const worker = mount();

    worker.emit({ status: 'loading', data: 'Loading model on WebGPU...' });
    worker.emit({ status: 'error', data: KERNEL_ERROR });

    expect(screen.getByTestId('status').textContent).toBe('error');
    expect(screen.getByTestId('error').textContent).toContain(
      'GatherBlockQuantized'
    );
    // The regression: a message here suppresses the error notice that carries
    // this text and the retry button.
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('writes a message for a failure after the model is ready', () => {
    const worker = mount();

    worker.emit({ status: 'loading', data: 'Loading model on WebGPU...' });
    worker.emit({ status: 'ready', data: 'webgpu', modelId: 'test-model' });
    expect(screen.getByTestId('status').textContent).toBe('ready');

    worker.emit({ status: 'error', data: 'Generation failed' });

    // A loaded model stays loaded — this is not a load failure — and the
    // visitor is told in the transcript, where they were waiting for an answer.
    expect(screen.getByTestId('status').textContent).toBe('ready');
    expect(Number(screen.getByTestId('count').textContent)).toBeGreaterThan(0);
  });
});
