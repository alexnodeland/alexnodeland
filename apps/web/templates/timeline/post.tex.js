/**
 * LaTeX template for a post's printable copy.
 *
 * The same arrangement the CV uses (see templates/cv/resume.tex.js): a pure
 * function of the post — its frontmatter and its markdown — and a build script
 * beside it, `scripts/build-post-pdfs.js`, that renders this and runs pdflatex.
 * Nothing here reads a file or shells out.
 *
 * The markdown the posts are written in is a small dialect, and this covers
 * exactly the parts of it they use: paragraphs, headings, links, emphasis,
 * inline code, simple lists, simple tables, and the raw `<figure>` block that
 * carries a photograph and its credit. Anything wider — a nested list, a code
 * fence, a blockquote — is not in the corpus, and the day it is, this is where
 * it goes.
 *
 * Deliberately plain pdflatex, with packages from texlive-latex-base /
 * -recommended / -extra / fonts-recommended, for the same reason the CV is:
 * CI apt-installs a small subset of TeX Live rather than the whole
 * distribution.
 */

/**
 * The characters the corpus holds that T1 cannot be handed raw. A table rather
 * than a run of replace() calls, so that adding one is adding a row.
 *
 * Anything not in it falls through as itself, which pdflatex refuses by name
 * ("Unicode character ∂ (U+2202)") and the build script surfaces — a loud stop
 * on a character nobody has decided how to set, rather than a PDF with a hole
 * in it.
 */
const UNICODE = {
  '·': '{\\textperiodcentered}',
  '→': '{\\textrightarrow}',
  '×': '{\\texttimes}',
  '²': '{\\textsuperscript{2}}',
  ł: '{\\l}',
  Ł: '{\\L}',
  đ: '{\\dj}',
  Đ: '{\\DJ}',
  á: "{\\'a}",
  // A grave over a circumflex: two accents, stacked, which TeX does natively.
  ề: '{\\`{\\^e}}',
  // Hook above, which T1 has no glyph for at all. Drawn in the preamble.
  ả: '{\\hookabove{a}}',
  // The mathematics in the posts is written inline, in prose — a gradient, a
  // partial, a bound — so each one is set as a one-symbol formula.
  '∂': '$\\partial$',
  '∇': '$\\nabla$',
  '≤': '$\\leq$',
  '√': '$\\surd$',
  α: '$\\alpha$',
};

/** Escapes the characters TeX would otherwise read as markup. */
const tex = (value = '') =>
  String(value)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    // The copy is written with real typographic dashes and quotes; hand them
    // to TeX as ligatures so they survive an ASCII-only font encoding.
    .replace(/—/g, '---')
    .replace(/–/g, '--')
    .replace(/[“”]/g, "''")
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '\\ldots{}')
    .replace(/[^\x20-\x7e\n]/g, char => UNICODE[char] ?? char);

/**
 * A URL, as hyperref wants it. Only the characters that would end the argument
 * or start a comment need touching; an underscore inside \href is already
 * literal, which is why the slugs survive.
 */
const url = (value = '') =>
  String(value)
    .replace(/\\/g, '\\\\')
    .replace(/([%#{}])/g, '\\$1');

/**
 * Relative links point at the site. On paper — and in a PDF that has been
 * mailed on — "/timeline/161114_infinicortex/" is not an address anyone can
 * follow, so the site's own root goes back on the front of it.
 */
const absolute = (href, siteUrl) =>
  href.startsWith('/') ? `${siteUrl.replace(/\/+$/, '')}${href}` : href;

const link = (label, href, siteUrl) =>
  `\\href{${url(absolute(href, siteUrl))}}{${label}}`;

/**
 * A place to park finished TeX while the text around it is escaped.
 *
 * The order is the whole trick of the two functions below. Anything carrying
 * backslashes of its own — a link, a code span, a markdown escape — is lifted
 * out and held before the text is escaped, then dropped back in afterwards;
 * otherwise the escape pass would run straight through the commands it had
 * just written. The marker is a doubled at-sign, which no post contains and
 * which the escape leaves alone.
 */
const holder = () => {
  const held = [];
  return {
    hold: value => {
      held.push(value);
      return `@@${held.length - 1}@@`;
    },
    release: text =>
      text.replace(/@@(\d+)@@/g, (_, index) => held[Number(index)]),
  };
};

/**
 * One run of prose: markdown's inline marks, in TeX. Emphasis is the one mark
 * handled after the escape rather than before it, since escaping leaves
 * asterisks alone.
 */
const inline = (raw, siteUrl) => {
  const { hold, release } = holder();

  const marked = String(raw)
    // A backslashed punctuation mark is markdown's way of saying "this one is
    // a character, not syntax" — `a\*star`. It has already done its job by the
    // time it reaches here, so it is held as the bare character and the
    // emphasis pass below never sees it.
    .replace(/\\([\\`*_{}[\]()#+\-.!])/g, (_, char) => hold(tex(char)))
    .replace(/`([^`]+)`/g, (_, code) => hold(`\\texttt{${tex(code)}}`))
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) =>
      hold(link(inline(label, siteUrl), href, siteUrl))
    );

  return release(
    tex(marked)
      .replace(/\*\*([^*]+)\*\*/g, '\\textbf{$1}')
      .replace(/\*([^*]+)\*/g, '\\emph{$1}')
  );
};

/** The markup a figcaption is allowed to carry: an anchor, and nothing else. */
const caption = (html, siteUrl) => {
  const { hold, release } = holder();

  const marked = String(html)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/<a\s+href="([^"]+)"\s*>([\s\S]*?)<\/a>/g, (_, href, label) =>
      hold(link(tex(label.replace(/<[^>]+>/g, '')), href, siteUrl))
    )
    .replace(/<[^>]+>/g, '');

  return release(tex(marked));
};

const HEADINGS = ['section', 'subsection', 'subsubsection', 'paragraph'];

/**
 * The markdown body, block by block. A line-at-a-time scanner rather than a
 * split on blank lines: a `<figure>` runs to several lines and has blank ones
 * inside it, and a table is a run of lines that ends without one.
 */
const body = (markdown, siteUrl, resolveImage) => {
  const lines = String(markdown).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  const isBullet = line => /^\s*[-*]\s+/.test(line);
  const isOrdered = line => /^\s*\d+\.\s+/.test(line);

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    // A photograph and its credit.
    if (/^<figure/.test(line.trim())) {
      const block = [];
      while (i < lines.length && !/<\/figure>/.test(lines[i])) {
        block.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) block.push(lines[i]);
      i += 1;

      const html = block.join('\n');
      const src = /src="([^"]+)"/.exec(html)?.[1];
      const credit = /<figcaption>([\s\S]*?)<\/figcaption>/.exec(html)?.[1];
      const file = src ? resolveImage(src) : null;

      if (file) {
        out.push(
          [
            '\\begin{figure}[htbp]',
            '\\centering',
            `\\includegraphics[width=\\linewidth]{${file}}`,
            credit && credit.trim()
              ? `\\caption*{${caption(credit, siteUrl)}}`
              : '',
            '\\end{figure}',
          ]
            .filter(Boolean)
            .join('\n')
        );
      } else if (credit && credit.trim()) {
        // No image to be had — a build with no converter on the box, or a
        // format pdflatex will not take. The credit is still worth printing.
        out.push(
          `{\\small\\itshape\\color{mutedink} ${caption(credit, siteUrl)}\\par}`
        );
      }
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = HEADINGS[Math.min(heading[1].length, HEADINGS.length) - 1];
      out.push(`\\${level}*{${inline(heading[2].trim(), siteUrl)}}`);
      i += 1;
      continue;
    }

    // A table: a run of pipe rows, the second of which is the rule.
    if (line.trim().startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].trim());
        i += 1;
      }
      const cells = row =>
        row
          .replace(/^\||\|$/g, '')
          .split('|')
          .map(cell => cell.trim());
      const head = cells(rows[0]);
      const rest = rows
        .slice(1)
        .filter(row => !/^\|[\s|:-]+\|?$/.test(row))
        .map(cells);
      out.push(
        [
          '\\begin{center}',
          `\\small\\begin{tabularx}{\\linewidth}{${head.map(() => 'X').join('')}}`,
          '\\hline',
          `${head
            .map(cell => `\\textbf{${inline(cell, siteUrl)}}`)
            .join(' & ')} \\\\`,
          '\\hline',
          ...rest.map(
            row => `${row.map(cell => inline(cell, siteUrl)).join(' & ')} \\\\`
          ),
          '\\hline',
          '\\end{tabularx}',
          '\\end{center}',
        ].join('\n')
      );
      continue;
    }

    if (isBullet(line) || isOrdered(line)) {
      const ordered = isOrdered(line);
      const items = [];
      while (i < lines.length && (isBullet(lines[i]) || isOrdered(lines[i]))) {
        items.push(lines[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, ''));
        i += 1;
      }
      const env = ordered ? 'enumerate' : 'itemize';
      out.push(
        [
          `\\begin{${env}}[leftmargin=1.4em,itemsep=0.2em,topsep=0.2em]`,
          ...items.map(item => `\\item ${inline(item, siteUrl)}`),
          `\\end{${env}}`,
        ].join('\n')
      );
      continue;
    }

    // A paragraph: everything up to the next blank line, or up to whatever
    // block starts without one.
    const paragraph = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^<figure/.test(lines[i].trim()) &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !lines[i].trim().startsWith('|') &&
      !isBullet(lines[i]) &&
      !isOrdered(lines[i])
    ) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    out.push(inline(paragraph.join(' '), siteUrl));
  }

  return out.join('\n\n');
};

const preamble = `\\documentclass[11pt,letterpaper]{article}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{charter}
\\usepackage[letterpaper,margin=1.15in]{geometry}
\\usepackage{graphicx}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage{tabularx}
\\usepackage{caption}
\\usepackage{xcolor}
\\usepackage{microtype}
\\usepackage{hyperref}

\\definecolor{rulegray}{gray}{0.72}
\\definecolor{mutedink}{gray}{0.35}
\\definecolor{linkink}{rgb}{0.05,0.32,0.2}

\\hypersetup{colorlinks=true,allcolors=linkink,pdfborder={0 0 0}}

% T1 has no hook-above accent and one place name in the corpus needs one: a
% raised, turned comma set over the letter, which is what the mark is.
\\providecommand{\\hookabove}[1]{%
  \\ooalign{\\hidewidth\\raisebox{1.05ex}{\\scalebox{0.7}{\\rotatebox[origin=c]{180}{,}}}\\hidewidth\\cr#1\\cr}}

% Prose, not a report: paragraphs are set off by space rather than marked by an
% indent, and the headings inside a post sit close to the text they open.
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0.7em}
\\linespread{1.06}

\\titleformat{\\section}{\\large\\bfseries}{}{0pt}{}
\\titlespacing*{\\section}{0pt}{1.5em}{0.35em}
\\titleformat{\\subsection}{\\normalsize\\bfseries}{}{0pt}{}
\\titlespacing*{\\subsection}{0pt}{1.2em}{0.3em}
\\titleformat{\\subsubsection}{\\normalsize\\itshape}{}{0pt}{}
\\titlespacing*{\\subsubsection}{0pt}{1em}{0.25em}

\\captionsetup{font={small,it},labelformat=empty,justification=raggedright,
  singlelinecheck=false,skip=0.5em}

% The foot of every page: who the piece belongs to, and which page this is.
% A downloaded PDF travels on its own — mailed, printed, dropped into a folder
% — with nothing of the site around it, so the one line the site's own footer
% carries goes on each page of it rather than once at the end.
%
% The plain page style is redefined rather than fancyhdr added: this is two
% lines of the kernel's own, and it is one fewer package for CI to install.
\\makeatletter
\\renewcommand{\\ps@plain}{%
  \\renewcommand{\\@oddhead}{}%
  \\renewcommand{\\@evenhead}{}%
  \\renewcommand{\\@oddfoot}{%
    \\parbox[t]{\\textwidth}{%
      {\\color{rulegray}\\rule{\\textwidth}{0.4pt}}\\\\[0.4em]
      \\footnotesize\\color{mutedink}\\POSTCOPYRIGHT\\hfill\\thepage
    }%
  }%
  \\renewcommand{\\@evenfoot}{\\@oddfoot}%
}
\\makeatother

\\pagestyle{plain}
`;

/**
 * One post, as a LaTeX document.
 *
 * @param {object} post              frontmatter, slug and markdown body
 * @param {object} options
 * @param {string} options.siteUrl   what a relative link is relative to
 * @param {string} options.author    whose the piece is, for the page footer
 * @param {(src: string) => string|null} options.resolveImage
 *        an `/images/…` path out of the markup, answered with a file pdflatex
 *        can include, or null when there is none to be had
 */
const renderPostTex = (post, { siteUrl, author, resolveImage }) => {
  const meta = [post.date, post.category].filter(Boolean).map(tex);
  const canonical = `${siteUrl.replace(/\/+$/, '')}/timeline/${post.slug}/`;
  // The year the piece was published, not the year it was typeset: the notice
  // is about the writing, and a PDF built on any later afternoon is the same
  // writing.
  const year = /^(\d{4})/.exec(post.iso ?? '')?.[1] ?? '';

  return `${preamble}
\\newcommand{\\POSTCOPYRIGHT}{{\\textcopyright}\\ ${tex(
    [year, 'all rights reserved,', author].filter(Boolean).join(' ')
  )}}

\\begin{document}

\\begin{flushleft}
{\\LARGE\\bfseries ${tex(post.title)}}\\\\[0.5em]
${
  post.description
    ? `{\\color{mutedink}\\itshape ${tex(post.description)}}\\\\[0.5em]`
    : ''
}{\\color{mutedink}\\small ${meta.join(' $\\cdot$ ')}}
\\end{flushleft}

\\vspace{0.1em}
{\\color{rulegray}\\rule{\\linewidth}{0.4pt}}
\\vspace{0.4em}

${body(post.body, siteUrl, resolveImage)}

\\vspace{1em}
{\\color{mutedink}\\small \\href{${url(canonical)}}{${tex(canonical)}}}

\\end{document}
`;
};

module.exports = { renderPostTex, tex, inline, body };
