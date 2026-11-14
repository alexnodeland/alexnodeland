import { isNotFoundPath } from '../../../lib/notFound';

describe('isNotFoundPath', () => {
  it('knows the two addresses Gatsby builds the 404 at', () => {
    // /404.html is the one a host serves for every address that is not a
    // page; /404/ is the same page at a directory's spelling.
    expect(isNotFoundPath('/404.html')).toBe(true);
    expect(isNotFoundPath('/404/')).toBe(true);
    expect(isNotFoundPath('/404')).toBe(true);
  });

  it('takes nothing else for it', () => {
    for (const pathname of [
      '/',
      '/timeline/',
      '/timeline/404/',
      '/404.html/more',
      '/4040/',
      '/dev-404-page/',
      '',
      undefined,
    ]) {
      expect(isNotFoundPath(pathname)).toBe(false);
    }
  });
});
