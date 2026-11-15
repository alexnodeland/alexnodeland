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
    // A background that existed before the rebuild, under its real id: the
    // one-time read of an old blob knows what colours it used to ship with.
    {
      id: 'simple-waves',
      name: 'Waves',
      description: 'Second',
      component: Dummy,
      defaultSettings: {
        opacity: 0.9,
        waveFrequency: 6,
        colors: {
          primary: [0.38, 0.34, 1.0],
          secondary: [0.98, 0.32, 0.72],
        },
      },
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
  const { updateCurrentSettings, currentSettings, state } = useBackground();
  return (
    <>
      <button onClick={() => updateCurrentSettings({ opacity: 0.1 } as never)}>
        edit
      </button>
      <output data-testid="current">
        {JSON.stringify({ id: state.currentBackgroundId, ...currentSettings })}
      </output>
    </>
  );
};

const current = () =>
  JSON.parse(screen.getByTestId('current').textContent ?? '{}');
const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');

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
        version: 2,
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

// What is written is the difference from the defaults, not the state: a
// default that moves later has to reach everyone who never touched it.
describe('what is saved', () => {
  const renderRestoring = () =>
    render(
      <SettingsPanelProvider>
        <BackgroundProvider>
          <Probe />
        </BackgroundProvider>
      </SettingsPanelProvider>
    );

  beforeEach(() => {
    jest.useFakeTimers();
    installStore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('is the background that is up and nothing else, until something is changed', () => {
    renderProbe();
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(saved()).toEqual({
      version: 2,
      currentBackgroundId: 'one',
      settings: {},
    });
  });

  it('is only the setting that was changed', () => {
    renderProbe();
    act(() => {
      screen.getByText('edit').click();
    });
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(saved()).toEqual({
      version: 2,
      currentBackgroundId: 'one',
      settings: { one: { opacity: 0.1 } },
    });
  });

  it('lets a default that has moved since reach a visitor who never changed it', () => {
    // Saved when the waves' frequency default was something else: nothing
    // about it is in the blob, so today's default is what they get.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        currentBackgroundId: 'simple-waves',
        settings: { 'simple-waves': { opacity: 0.5 } },
      })
    );
    renderRestoring();
    expect(current()).toMatchObject({
      id: 'simple-waves',
      opacity: 0.5,
      waveFrequency: 6,
    });
  });

  describe('from a visit before the backgrounds were rebuilt', () => {
    // The whole state, as it used to be written.
    const visitedBefore = (colors: Record<string, number[]>) =>
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          currentBackgroundId: 'simple-waves',
          showSettingsPanel: true,
          closingSettingsPanel: false,
          settings: {
            one: { opacity: 0.3 },
            'simple-waves': { opacity: 0.6, waveFrequency: 11, colors },
          },
        })
      );

    it('comes back to the same background with the new numbers', () => {
      visitedBefore({
        primary: [0.2, 0.1, 0.8],
        secondary: [0.8, 0.2, 0.8],
      });
      renderRestoring();
      // Its numbers were tuned against a picture that no longer exists, and
      // its colours were the ones it shipped with: all of it is today's.
      expect(current()).toEqual({
        id: 'simple-waves',
        opacity: 0.9,
        waveFrequency: 6,
        colors: {
          primary: [0.38, 0.34, 1.0],
          secondary: [0.98, 0.32, 0.72],
        },
      });
    });

    it('keeps a colour somebody chose', () => {
      visitedBefore({
        primary: [0.2, 0.1, 0.8],
        secondary: [0.1, 0.9, 0.3],
      });
      renderRestoring();
      expect(current().colors).toEqual({
        primary: [0.38, 0.34, 1.0],
        secondary: [0.1, 0.9, 0.3],
      });
    });

    it('is written back in the new shape, once', () => {
      visitedBefore({
        primary: [0.2, 0.1, 0.8],
        secondary: [0.1, 0.9, 0.3],
      });
      renderRestoring();
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(saved()).toEqual({
        version: 2,
        currentBackgroundId: 'simple-waves',
        settings: {
          'simple-waves': { colors: { secondary: [0.1, 0.9, 0.3] } },
        },
      });
    });
  });
});
