import { act, render, screen } from '@testing-library/react';
import React from 'react';
import {
  BackgroundProvider,
  useBackground,
} from '../../../components/BackgroundProvider';
import { SettingsPanelProvider } from '../../../components/SettingsPanelContext';

jest.mock('../../../components/animated-backgrounds/index', () => {
  const Dummy = () => null;
  const registry = [
    {
      id: 'one',
      name: 'One',
      description: 'First',
      component: Dummy,
      defaultSettings: { opacity: 0.8 },
      settingsSchema: [],
    },
  ];
  return {
    backgroundRegistry: registry,
    getBackgroundById: (id: string) => registry.find(bg => bg.id === id),
  };
});

const STORAGE_KEY = 'animatedBackgroundSettings';

const Probe: React.FC = () => {
  const { updateCurrentSettings } = useBackground();
  return (
    <button onClick={() => updateCurrentSettings({ opacity: 0.1 } as never)}>
      edit
    </button>
  );
};

const renderProbe = () =>
  render(
    <SettingsPanelProvider>
      <BackgroundProvider initialBackgroundId="one">
        <Probe />
      </BackgroundProvider>
    </SettingsPanelProvider>
  );

// The shared setup stubs localStorage with inert jest.fn()s, which is fine for
// suites that only care that it was called. These assert on what survives, so
// they need a store that actually stores.
const installStore = () => {
  const store = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, String(value)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size;
      },
    },
  });
};

const savedOpacity = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw).settings?.one?.opacity : undefined;
};

// The write is debounced so that dragging a slider doesn't stringify the whole
// settings blob once per input event. That buys a window in which a change
// exists only in memory, and these cover the ways out of it.
describe('settings persistence', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    installStore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces the write rather than saving on every change', () => {
    renderProbe();
    act(() => {
      jest.advanceTimersByTime(500);
    });

    act(() => {
      screen.getByText('edit').click();
    });
    // Still in the debounce window: nothing written yet.
    expect(savedOpacity()).not.toBe(0.1);

    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(savedOpacity()).toBe(0.1);
  });

  it('flushes a pending write when the page is hidden', () => {
    renderProbe();
    act(() => {
      jest.advanceTimersByTime(500);
    });

    act(() => {
      screen.getByText('edit').click();
    });
    expect(savedOpacity()).not.toBe(0.1);

    // A backgrounded tab can be discarded without ever running the timer, so
    // the change has to reach storage on the way out.
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(savedOpacity()).toBe(0.1);
  });

  it('flushes a pending write when the provider unmounts', () => {
    const { unmount } = renderProbe();
    act(() => {
      jest.advanceTimersByTime(500);
    });

    act(() => {
      screen.getByText('edit').click();
    });
    expect(savedOpacity()).not.toBe(0.1);

    act(() => {
      unmount();
    });
    expect(savedOpacity()).toBe(0.1);
  });

  it('flushes the restored settings, never the first-render defaults', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currentBackgroundId: 'one',
        settings: { one: { opacity: 0.42 } },
      })
    );

    // No initialBackgroundId, so the restore path runs. The flush paths hang
    // off the same `mounted` guard as the debounced write, so a page hidden
    // immediately after load writes back what was restored — it can never
    // clobber a saved setting with the deterministic defaults the provider
    // renders before hydration.
    const { unmount } = render(
      <SettingsPanelProvider>
        <BackgroundProvider>
          <Probe />
        </BackgroundProvider>
      </SettingsPanelProvider>
    );

    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(savedOpacity()).toBe(0.42);

    act(() => {
      unmount();
    });
    expect(savedOpacity()).toBe(0.42);
  });
});
