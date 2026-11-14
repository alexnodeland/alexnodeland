/**
 * What gatsby-ssr puts in every page's head before the page adds its own:
 * the document language, the feed for autodiscovery, the rel="me" claims,
 * and the way to the site's RDF.
 */
import React from 'react';
import { onRenderBody } from '../../../gatsby-ssr';
import { headComponents } from '../../lib/head';
import { siteConfig } from '../../config/site';

describe('the site-wide head', () => {
  const props = (el: React.ReactElement) => el.props as Record<string, string>;

  it('sets the document language', () => {
    const setHtmlAttributes = jest.fn();
    const setHeadComponents = jest.fn();
    onRenderBody({ setHtmlAttributes, setHeadComponents });
    expect(setHtmlAttributes).toHaveBeenCalledWith({ lang: 'en' });
    expect(setHeadComponents).toHaveBeenCalledWith(headComponents());
  });

  it('hands the page being rendered to the head, which is what decides its preloads', () => {
    const setHtmlAttributes = jest.fn();
    const setHeadComponents = jest.fn();
    onRenderBody({
      pathname: '/timeline/some-post/',
      setHtmlAttributes,
      setHeadComponents,
    });
    expect(setHeadComponents).toHaveBeenCalledWith(
      headComponents('/timeline/some-post/')
    );
  });

  describe('the typeface', () => {
    const preloads = (pathname?: string) =>
      headComponents(pathname).filter(el => props(el).rel === 'preload');

    it('preloads the regular and the italic on a page whose hero has a tagline', () => {
      for (const pathname of ['/', '/timeline/', '/projects', '/cv/']) {
        expect(preloads(pathname).map(el => props(el).href)).toEqual([
          '/static/jetbrains-mono-latin-400.woff2',
          '/static/jetbrains-mono-latin-400-italic.woff2',
        ]);
      }
    });

    it('leaves the italic off a page that opens without it', () => {
      // A post and the 404 wear the brand alone, with no tagline: a preload
      // nothing on the first screen uses is a download in front of the ones
      // that matter.
      for (const pathname of ['/timeline/some-post/', '/404.html', '/404/']) {
        expect(preloads(pathname).map(el => props(el).href)).toEqual([
          '/static/jetbrains-mono-latin-400.woff2',
        ]);
      }
    });

    it('asks for each as a font, in CORS mode', () => {
      // Fonts are fetched anonymously even from the same origin; a preload
      // that does not say so is fetched once for nothing and then again.
      for (const el of preloads('/')) {
        expect(props(el)).toMatchObject({
          as: 'font',
          type: 'font/woff2',
          crossOrigin: 'anonymous',
        });
      }
    });
  });

  it('links the Atom and JSON Feed forms of the timeline, and leaves RSS to the plugin', () => {
    const feeds = headComponents()
      .filter(el => props(el).rel === 'alternate')
      .map(el => [props(el).type, props(el).href]);
    expect(feeds).toEqual([
      ['application/atom+xml', '/atom.xml'],
      ['application/feed+json', '/feed.json'],
    ]);
  });

  it('claims every profile the footer links, and the email, with rel="me"', () => {
    const me = headComponents()
      .filter(el => props(el).rel === 'me')
      .map(el => props(el).href);
    expect(me).toEqual([
      siteConfig.social.linkedin,
      siteConfig.social.github,
      `mailto:${siteConfig.contact.email}`,
    ]);
  });

  it('points at the FOAF profile and the VoID description', () => {
    const rels = Object.fromEntries(
      headComponents()
        .filter(el => ['meta', 'describedby'].includes(props(el).rel))
        .map(el => [props(el).rel, props(el)])
    );
    expect(rels.meta).toMatchObject({
      type: 'text/turtle',
      href: 'https://alexnodeland.com/me.ttl',
    });
    expect(rels.describedby).toMatchObject({
      type: 'text/turtle',
      href: 'https://alexnodeland.com/void.ttl',
    });
  });
});
