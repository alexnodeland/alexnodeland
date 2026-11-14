/**
 * The numbers that are written down twice: once where the stylesheets need
 * them and once where something else does. Each pair is one fact, and these
 * are what hold the two spellings of it together.
 */
import fs from 'fs';
import path from 'path';
import { COMPACT_QUERY } from '../../../components/animated-backgrounds/core/useIsMobileViewport';

const root = path.resolve(__dirname, '../../../..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe("the phone chrome's breakpoint", () => {
  it('is the same query in the stylesheets and in the script', () => {
    const scss = read('src/styles/mixins.scss').match(/\$compact:\s*'([^']+)'/);
    expect(scss).not.toBeNull();
    expect((scss as RegExpMatchArray)[1]).toBe(COMPACT_QUERY);
  });

  it('answers to a short viewport held in a hand as well as a narrow one', () => {
    // A phone on its side is wider than the old 768px line, and it is still
    // a phone; a short window with a mouse is a desktop someone has resized.
    expect(COMPACT_QUERY).toContain('(max-width: 768px)');
    expect(COMPACT_QUERY).toMatch(
      /\(max-height: \d+px\) and \(pointer: coarse\)/
    );
  });
});

describe('the typeface', () => {
  const fontsScss = read('src/styles/fonts.scss');
  const subsetScript = read('scripts/subset-fonts.sh');

  // `'latin': ( U+0020-007E, … )` in the stylesheet; `LATIN="U+0020-007E,…"`
  // in the script.
  const declared = (subset: string): string[] => {
    const block = fontsScss.match(
      new RegExp(`'${subset}':\\s*\\(([^)]*)\\)`)
    ) as RegExpMatchArray;
    return block[1]
      .split(',')
      .map(range => range.trim())
      .filter(Boolean);
  };
  const cut = (name: string): string[] =>
    (
      subsetScript.match(
        new RegExp(`^${name}="([^"]+)"`, 'm')
      ) as RegExpMatchArray
    )[1].split(',');

  it.each([
    ['latin', 'LATIN'],
    ['ext', 'EXT'],
  ])(
    'declares the %s range the files were actually cut to',
    (subset, variable) => {
      // A range the stylesheet claims and the file does not hold is drawn as
      // a box; one the file holds and the stylesheet does not claim is never
      // fetched.
      expect(declared(subset)).toEqual(cut(variable));
    }
  );

  it('ships every cut the stylesheet asks for, and the licence with them', () => {
    const files = [
      ...fontsScss.matchAll(/\(\s*(\d+),\s*(\w+),\s*'([^']+)'\s*\)/g),
    ]
      .map(match => match[3])
      .flatMap(name => ['latin', 'ext'].map(subset => `${subset}-${name}`));
    expect(files).toHaveLength(8);
    for (const file of files) {
      expect(
        fs.existsSync(path.join(root, `src/fonts/jetbrains-mono-${file}.woff2`))
      ).toBe(true);
    }
    expect(read('src/fonts/OFL.txt')).toContain('SIL OPEN FONT LICENSE');
  });

  it('is preloaded under the names it is shipped under', () => {
    const head = read('src/lib/head.tsx');
    expect(head).toContain("'../fonts/jetbrains-mono-latin-400.woff2'");
    expect(head).toContain("'../fonts/jetbrains-mono-latin-400-italic.woff2'");
  });
});
