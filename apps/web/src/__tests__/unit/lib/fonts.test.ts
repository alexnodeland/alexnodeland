import { FONT_WEIGHT_STRONG, whenFontReady } from '../../../lib/utils/fonts';

// jsdom has no `document.fonts`, so each case installs the one it needs.
type Fonts = typeof document.fonts;

const installFonts = (fonts: Partial<Fonts> | undefined) => {
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: fonts,
  });
};

describe('whenFontReady', () => {
  afterEach(() => {
    installFonts(undefined);
    jest.useRealTimers();
  });

  it('runs at once where the browser cannot say', () => {
    const callback = jest.fn();
    whenFontReady(FONT_WEIGHT_STRONG, '404', callback);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('runs at once, synchronously, when the cut is already loaded', () => {
    const check = jest.fn(() => true);
    const load = jest.fn();
    installFonts({ check, load } as unknown as Fonts);

    const callback = jest.fn();
    whenFontReady(FONT_WEIGHT_STRONG, '404', callback);

    expect(check).toHaveBeenCalledWith("600 1em 'JetBrains Mono'", '404');
    expect(callback).toHaveBeenCalledTimes(1);
    expect(load).not.toHaveBeenCalled();
  });

  it('waits for the file, then runs once', async () => {
    let land: () => void = () => {};
    const load = jest.fn(
      () => new Promise<FontFace[]>(resolve => (land = () => resolve([])))
    );
    installFonts({ check: () => false, load } as unknown as Fonts);

    const callback = jest.fn();
    whenFontReady(FONT_WEIGHT_STRONG, '404', callback);
    expect(callback).not.toHaveBeenCalled();

    land();
    await Promise.resolve();
    await Promise.resolve();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('gives up waiting rather than hold the page for a font that is not coming', () => {
    jest.useFakeTimers();
    installFonts({
      check: () => false,
      load: () => new Promise<FontFace[]>(() => {}),
    } as unknown as Fonts);

    const callback = jest.fn();
    whenFontReady(FONT_WEIGHT_STRONG, '404', callback);
    expect(callback).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not run once it has been called off', async () => {
    let land: () => void = () => {};
    installFonts({
      check: () => false,
      load: () =>
        new Promise<FontFace[]>(resolve => (land = () => resolve([]))),
    } as unknown as Fonts);

    const callback = jest.fn();
    const cancel = whenFontReady(FONT_WEIGHT_STRONG, '404', callback);
    cancel();
    land();
    await Promise.resolve();
    await Promise.resolve();
    expect(callback).not.toHaveBeenCalled();
  });
});
