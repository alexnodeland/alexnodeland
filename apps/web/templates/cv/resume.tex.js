/**
 * LaTeX template for the CV artifacts.
 *
 * Everything here is a pure function of `CVData` from `src/config/cv.ts`, which
 * stays the single source of truth — this file only decides how that data is
 * set on a page. `scripts/build-cv.js` renders it and runs pdflatex.
 *
 * Four variants, all resolved out of `cvSource` by `buildVariant`:
 *
 *   resume      — the neutral one-pager.
 *   fde         — one page for Forward Deployed Engineer roles.
 *   ai-engineer — one page for AI Engineer roles.
 *   music-tech  — one page for music technology roles.
 *   full        — everything, over as many pages as it takes.
 *
 * The three one-pagers share a layout and differ only in what `buildVariant`
 * hands them. The knobs at the top of `preamble()` — margin, fontSize,
 * sectionBefore, sectionAfter, itemSep, roleSep — are what you reach for if one
 * ever spills onto a second page. They are already tight; trimming a bullet or
 * lowering a `maxBullets` in src/config/cv.ts is usually better.
 *
 * Deliberately plain pdflatex with packages from texlive-latex-recommended /
 * -extra / fonts-recommended, so CI can apt-install a small subset of TeX Live
 * rather than pulling the whole distribution.
 */

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
    .replace(/[""]/g, "''")
    .replace(/['']/g, "'")
    .replace(/…/g, '\\ldots{}');

// The gap either side is set with \hspace rather than left to interword glue.
// PDF text carries no space characters — a "space" is a positioning jump — so
// every extractor decides where one word ends by measuring the gap against a
// typical character width. At normal interword spacing the separator falls
// under that threshold and the run either side of it is merged into a single
// token: the contact line came out as "USA·alex@ournature.studio·alexnodeland.com",
// one unsplittable string where an address, an email and a site should be, and
// a role's dates came out glued to its location. Half an em clears the
// threshold in every extractor tried here.
const SEP_GAP = '0.5em';
const SEPARATOR = `\\hspace{${SEP_GAP}}$\\cdot$\\hspace{${SEP_GAP}}`;

/** The full CV is the only variant that runs to as many pages as it takes. */
const isFull = variant => variant === 'full';

const preamble = (variant, data) => {
  const onePage = !isFull(variant);

  // The one-pager runs tighter on every axis; the full CV can breathe.
  const margin = onePage ? '0.55in' : '0.9in';
  const fontSize = onePage ? '10pt' : '11pt';
  const sectionBefore = onePage ? '1.1ex' : '2.2ex';
  const sectionAfter = onePage ? '0.7ex' : '1.2ex';
  const itemSep = onePage ? '0.08em' : '0.25em';
  const roleSep = onePage ? '0.55em' : '0.9em';

  return `\\documentclass[${fontSize},letterpaper]{article}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{charter}
\\usepackage[margin=${margin}]{geometry}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage{array}
\\usepackage{tabularx}
\\usepackage{xcolor}
\\usepackage{microtype}
\\usepackage{needspace}
\\usepackage[hidelinks]{hyperref}
% The document says whose it is in its own metadata, which is the first place
% a document-management tool looks and where a downloaded file gets its name
% from. Left unset, the Title is empty and the Author is whoever ran pdflatex.
\\hypersetup{
  unicode,
  pdftitle={${tex(data.personal.name)} - ${tex(data.personal.title)}},
  pdfauthor={${tex(data.personal.name)}},
}

\\definecolor{rulegray}{gray}{0.72}
\\definecolor{mutedink}{gray}{0.35}

\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}

% No hyphenation, at either kind of hyphen. A word broken at a line end
% reaches the text layer as two pieces with a hyphen between them, and what
% a parser does with that is its own business: pdftotext's reflow mode joins
% "Learn-" and "ing" back into a word, its layout mode does not, and a
% keyword filter reading "Machine Learn- ing" matches neither term. The
% explicit kind is worse — "music-ML" broken after its hyphen is "musicML"
% to a parser that deletes line-end hyphens, which is most of them. The
% stretch below is what keeps a justified line from overflowing when it can
% no longer break inside a word.
\\hyphenpenalty=10000
\\exhyphenpenalty=10000
\\emergencystretch=1.5em

% Real capitals, not \\scshape. Small caps set "Summary" as a full-size S
% followed by capital-shaped glyphs at lowercase size, and every PDF text
% extractor reads the size change as a word boundary: pdftotext returns
% "S UMMARY", "E XPERIENCE", "E DUCATION". An ATS scanning for the standard
% section names finds none of them, loses the section boundaries, and falls
% back to guessing where one job ends and the next begins — which is how
% whole entries get fused or dropped. \\MakeUppercase costs nothing visually
% and puts the literal word in the text layer.
\\titleformat{\\section}
  {\\normalsize\\bfseries}{}{0pt}{\\MakeUppercase}
  [\\vspace{-0.75em}{\\color{rulegray}\\rule{\\linewidth}{0.5pt}}]
\\titlespacing*{\\section}{0pt}{${sectionBefore}}{${sectionAfter}}

\\newlength{\\rolesep}
\\setlength{\\rolesep}{${roleSep}}

% A section heading stranded at the foot of a page with its content overleaf
% reads as a mistake. Reserve enough room for the heading, its rule, and the
% first couple of lines under it, or start the page early.
\\let\\cvsection\\section
\\renewcommand{\\section}[1]{\\needspace{5\\baselineskip}\\cvsection{#1}}

% Title and organisation on the left, place and dates on the right, one line
% each. Giving the location a line of its own costs eight lines across the
% one-pager, which is most of a section.
%
% Two columns rather than \\hfill. \\hfill collapses to nothing once the title
% is long enough to reach the rail, so the two run together and the tail of the
% date wraps onto a line of its own. Here the right column is sized to its own
% content and pinned to the margin, and the left column takes whatever is left
% — so the date is always flush right on the first line, and a title long
% enough to need it wraps within its own column instead of colliding.
%
% The one thing this layout cannot take is a title that actually wraps. Text
% extraction orders by position, so the right cell lands between the two halves
% of the left one: the date is read as part of the entry, the tail of the title
% as an orphan line, and the company is severed from the role. Keep
% "Title, Company" to a single line -- scripts/check-cv-text.js fails the build
% on any entry that does not.
\\newcolumntype{L}{>{\\raggedright\\arraybackslash}X}
\\renewcommand{\\arraystretch}{1}

% Ends the current paragraph with #1 flush right: on the same line when it
% fits, and otherwise on a line of its own, still flush right. The TeXbook's
% construction — the \\penalty50 between two \\hfil is where the line may break,
% \\mbox keeps #1 whole, and \\parfillskip=0pt stops the last line being set
% ragged. Used for the dates beside a one-pager's job titles and for the link at
% the end of every project.
\\newcommand{\\trailright}[1]{%
  \\unskip\\nobreak\\hfil\\penalty50\\hskip1em\\hbox{}\\nobreak\\hfil
  \\mbox{#1}{\\parfillskip=0pt\\par}%
}

% The print equivalent of break-inside: avoid. Reserve the title line, the
% place-and-date line, and the first two bullets, so a role either starts a
% page with its own body under it or is carried over whole. Without this a
% page boundary can fall exactly between one role's trailing Skills line and
% the next role's title, and a parser that drops the form feed between them
% reads the two as one line — the "Infrastructure as CodeTechnical Strategy
% Consultant" failure. Four lines, not more: a larger reserve leaves visible
% gaps at the foot of the full CV's pages.
${
  onePage
    ? `% The one-pagers set the meta flush right within the title's own paragraph,
% not in a table cell, so title and meta share one paragraph and one baseline.
%
% What right alignment cannot avoid is the wide gap before the meta. In
% pdftotext's default reflow mode that gap splits the meta into a block of its
% own, and for some entries the block is read after the bullets: title,
% bullets, date. The date still lands inside its own entry, before the next
% title, so a parser reading top to bottom attaches it correctly, and
% OpenResume does. scripts/check-cv-text.js asserts exactly that span and fails
% if a date ever crosses into the next entry. Setting the meta inline after the
% title removes the gap altogether, if that trade is ever wanted instead.
%
% The meta sits at the right margin on the title's line when both fit, and
% otherwise breaks onto a line of its own, still flush right (\\trailright).
\\newcommand{\\entry}[2]{%
  \\needspace{4\\baselineskip}%
  \\noindent\\textbf{#1}\\trailright{\\small\\color{mutedink}#2}%
}`
    : `\\newcommand{\\entry}[2]{%
  \\needspace{4\\baselineskip}%
  \\noindent\\begin{tabularx}{\\linewidth}{@{}L@{\\hspace{1em}}r@{}}
    \\textbf{#1} & {\\small\\color{mutedink}#2}
  \\end{tabularx}\\par
}`
}

\\newenvironment{points}
  {\\begin{itemize}[leftmargin=1.15em,itemsep=${itemSep},parsep=0pt,topsep=0.25em,partopsep=0pt,label={\\color{rulegray}\\textbullet}]}
  {\\end{itemize}}
`;
};

const header = data => {
  const { name, title, location, email, website, phone } = data.personal;
  const contact = [
    tex(location),
    `\\href{mailto:${email}}{${tex(email)}}`,
    `\\href{https://${website}}{${tex(website)}}`,
    phone ? `\\href{tel:${phone.replace(/\s/g, '')}}{${tex(phone)}}` : null,
  ]
    .filter(Boolean)
    .join(SEPARATOR);

  return `\\begin{center}
  {\\LARGE\\bfseries ${tex(name)}}\\\\[0.3em]
  {\\itshape ${tex(title)}}\\\\[0.45em]
  {\\small ${contact}}
\\end{center}
\\vspace{0.3em}
`;
};

/**
 * The right-hand rail of a role: where, how it was held, and when.
 *
 * The engagement type is what stops three overlapping entries reading as job
 * hopping — "Freelance" beside 2022–Present says the same years counted twice
 * are one person consulting on the side, not a CV that does not add up.
 */
const roleMeta = role =>
  [role.location, role.engagement, role.duration]
    .filter(Boolean)
    .map(tex)
    .join(SEPARATOR);

const experience = (data, variant) =>
  data.experience
    .map(role => {
      // The full CV carries the per-role skill list; on the one-pager that is
      // six extra lines saying what the bullets already said.
      const skills =
        isFull(variant) && role.skills && role.skills.length > 0
          ? `\\vspace{0.15em}{\\small\\color{mutedink}Skills: ${tex(role.skills.join(', '))}}\\par\n`
          : '';

      const description =
        isFull(variant) && role.description
          ? `{\\small\\itshape ${tex(role.description)}}\\par\n`
          : '';

      const entry = `\\entry{${tex(role.title)}, ${tex(role.company)}}{${roleMeta(role)}}`;

      const bullets = role.achievements
        .map(item => `  \\item ${tex(item)}`)
        .join('\n');

      return `${entry}
${description}\\begin{points}
${bullets}
\\end{points}
${skills}\\vspace{\\rolesep}
`;
    })
    .join('\n');

/**
 * The projects section, from the selection in `cvSource.projects`.
 *
 * The URL is printed rather than hidden behind link text: a PDF read as plain
 * text by a parser keeps the address, and a reader who wants the code can type
 * it. `\\href` still makes it clickable for everyone else.
 */
const projects = (data, variant) =>
  data.projects
    .map(project => {
      const link = project.github || project.url;

      // On the one-pagers, set flush right at the end of the project's line, by
      // \trailright, which also keeps it whole. It must never break across
      // lines: a repo named `claude-telegram` otherwise wraps at its own
      // hyphen, and every extractor treats a hyphen at a line break as
      // hyphenation and deletes it — the PDF reads correctly and the extracted
      // link is `alexnodeland/claudetelegram`, which 404s. When the line has no
      // room for it, the whole URL moves to the next line, still flush right.
      const href = link
        ? `\\href{${link}}{${tex(link.replace(/^https?:\/\//, ''))}}`
        : '';
      const endWithLink = href
        ? `\\trailright{\\small\\color{mutedink}${href}}`
        : '\\par';

      // Three lines a project is most of a section on a page that has one. The
      // one-pagers take a single line each — name, what it is, where it lives —
      // which still starts with the project name, so a parser reading line by
      // line gets the same fields out of it.
      if (!isFull(variant)) {
        // Not \raggedright: LaTeX sets it as infinite stretch at the right edge,
        // which shares the line's slack with \trailright's glue and leaves the
        // link short of the margin, at a different place on every line.
        return `\\needspace{2\\baselineskip}{\\noindent\\textbf{${tex(project.name)}} --- ${tex(
          project.description
        )}${endWithLink}}
\\vspace{0.25em}
`;
      }

      // The full CV sets the link where a role's dates go: in the entry's right
      // column, beside the name. That column never wraps, so the link stays
      // whole there too; the language it replaced said less than the link does.
      return `\\entry{${tex(project.name)}}{${href}}
${tex(project.description)}\\par
\\vspace{\\rolesep}
`;
    })
    .join('\n');

const education = (data, variant) =>
  data.education
    .map(entry => {
      const parts = [];

      if (entry.gpa) parts.push(`{\\small GPA: ${tex(entry.gpa)}}\\par`);

      // On a one-pager the degree, the school and the years are the whole of
      // what anyone reads here; the gloss and the research bullet are four
      // lines that the experience section always wants more.
      if (isFull(variant) && entry.description)
        parts.push(`{\\small ${tex(entry.description)}}\\par`);

      // Coursework is the first thing to go when the page has to fit.
      if (
        isFull(variant) &&
        entry.relevantCoursework &&
        entry.relevantCoursework.length > 0
      ) {
        parts.push(
          `{\\small\\color{mutedink}Coursework: ${tex(entry.relevantCoursework.join(', '))}}\\par`
        );
      }

      if (
        isFull(variant) &&
        entry.achievements &&
        entry.achievements.length > 0
      ) {
        parts.push(
          `\\begin{points}\n${entry.achievements
            .map(item => `  \\item ${tex(item)}`)
            .join('\n')}\n\\end{points}`
        );
      }

      return `\\entry{${tex(entry.degree)}}{${tex(entry.institution)}${SEPARATOR}${tex(entry.duration)}}
${parts.join('\n')}
\\vspace{\\rolesep}
`;
    })
    .join('\n');

const skills = (data, variant) => {
  const lines = [
    `\\textbf{Technical}\\quad ${tex(data.skills.technical.join(', '))}\\par`,
  ];

  // Soft skills read as filler next to fifteen achievement bullets, so the
  // one-pager spends its remaining lines on the technical list alone.
  if (isFull(variant) && data.skills.soft && data.skills.soft.length > 0) {
    lines.push(
      `\\vspace{0.3em}\\textbf{Soft}\\quad ${tex(data.skills.soft.join(', '))}\\par`
    );
  }

  if (data.skills.languages && data.skills.languages.length > 0) {
    lines.push(
      `\\vspace{0.3em}\\textbf{Languages}\\quad ${tex(data.skills.languages.join(', '))}\\par`
    );
  }

  return lines.join('\n');
};

const certifications = data =>
  `\\begin{points}
${data.certifications
  .map(
    cert =>
      `  \\item ${tex(cert.name)}, ${tex(cert.issuer)} (${tex(cert.date)})`
  )
  .join('\n')}
\\end{points}
`;

/**
 * Renders `data` as a complete LaTeX document.
 *
 * @param {import('../../src/config/cv').CVData} data
 * @param {{ variant: 'resume' | 'full' }} options
 * @returns {string} TeX source, ready for pdflatex
 */
const renderResumeTex = (data, { variant }) => {
  // Section order and names are the conventional ones on purpose. A parser
  // that recognises "Summary / Experience / Projects / Education / Skills"
  // assigns every entry to the right field; anything inventive here is read as
  // free text and the structure is lost.
  const sections = [
    header(data),
    `\\section{Summary}\n${tex(data.personal.summary)}\\par\n`,
    `\\section{Experience}\n${experience(data, variant)}`,
  ];

  if (data.projects && data.projects.length > 0) {
    sections.push(`\\section{Projects}\n${projects(data, variant)}`);
  }

  sections.push(
    `\\section{Education}\n${education(data, variant)}`,
    `\\section{Skills}\n${skills(data, variant)}\n`
  );

  if (
    isFull(variant) &&
    data.certifications &&
    data.certifications.length > 0
  ) {
    sections.push(`\\section{Certifications}\n${certifications(data)}`);
  }

  return `${preamble(variant, data)}
\\begin{document}
${sections.join('\n')}
\\end{document}
`;
};

module.exports = { renderResumeTex, tex };
