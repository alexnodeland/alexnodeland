import React from 'react';

/**
 * Copy of Gatsby's default HTML template, overridden for one reason: the
 * viewport meta.
 *
 * Gatsby ships `width=device-width, initial-scale=1, shrink-to-fit=no`, and
 * without `viewport-fit=cover` iOS reports every `env(safe-area-inset-*)` as
 * zero. The mobile background chrome uses those insets to clear the notch and
 * the home indicator, so on the one platform that has either, the handling
 * silently resolved to nothing. The tag is part of this template rather than a
 * head component, so `onPreRenderHTML` cannot reach it — this file is the
 * documented way to change it.
 *
 * Gatsby's own copy declares propTypes via `prop-types`, which this project
 * only has transitively; the annotations are dropped rather than take on an
 * undeclared dependency for them.
 */
export default function HTML(props) {
  return (
    <html {...props.htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="x-ua-compatible" content="ie=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        {props.headComponents}
      </head>
      <body {...props.bodyAttributes}>
        {props.preBodyComponents}
        <div
          key={`body`}
          id="___gatsby"
          dangerouslySetInnerHTML={{ __html: props.body }}
        />
        {props.postBodyComponents}
      </body>
    </html>
  );
}
