import {
  forgetPostOffTimeline,
  readTimelineView,
  rememberPost,
  saveTimelineView,
} from '../../../lib/timelineView';

describe('timelineView', () => {
  const getItem = window.sessionStorage.getItem as jest.Mock;
  const setItem = window.sessionStorage.setItem as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    getItem.mockReturnValue(null);
  });

  it('reads nothing when nothing was saved', () => {
    expect(readTimelineView()).toBeNull();
  });

  it('merges a patch over what is already there', () => {
    getItem.mockReturnValue(
      JSON.stringify({ tag: 'AI', sort: 'asc', search: '', scrollTop: 120 })
    );

    saveTimelineView({ scrollTop: 300 });

    expect(JSON.parse(setItem.mock.calls[0][1])).toMatchObject({
      tag: 'AI',
      sort: 'asc',
      scrollTop: 300,
    });
  });

  it('remembers a post', () => {
    rememberPost('/my-post/');
    expect(setItem).toHaveBeenCalledWith(
      'timeline:view',
      expect.stringContaining('"slug":"/my-post/"')
    );
  });

  describe('forgetPostOffTimeline', () => {
    it.each([
      '/timeline',
      '/timeline/',
      '/timeline/my-post',
      '/timeline/my-post/',
    ])('leaves the post alone on %s', pathname => {
      forgetPostOffTimeline(pathname);
      expect(setItem).not.toHaveBeenCalled();
    });

    it.each(['/', '/projects', '/cv', '/timelines', undefined])(
      'forgets the post on %s',
      pathname => {
        getItem.mockReturnValue(JSON.stringify({ slug: '/my-post/' }));
        forgetPostOffTimeline(pathname);
        expect(setItem).toHaveBeenCalledWith(
          'timeline:view',
          expect.stringContaining('"slug":null')
        );
      }
    );
  });
});
