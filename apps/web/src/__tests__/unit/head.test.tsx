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
