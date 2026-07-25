/**
 * LaTeX template for the CV artifacts.
 *
 * Everything here is a pure function of `CVData` from `src/config/cv.ts`, which
 * stays the single source of truth — this file only decides how that data is
 * set on a page. `scripts/build-cv.js` renders it and runs pdflatex.
 *
 * Two variants:
 *
 *   resume — the one-page version, fed `resumeData`. The knobs at the top of
 *            `preamble()` — margin, fontSize, sectionBefore, sectionAfter,
 *            itemSep, roleSep — are what you reach for if it ever spills onto
 *            a second page. They are already tight; trimming a bullet or
 *            lowering a `maxBullets` in src/config/cv.ts is usually better.
 *   full   — everything, over as many pages as it takes.
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

const SEPARATOR = ' $\\cdot$ ';

const preamble = variant => {
  const onePage = variant === 'resume';

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

\\definecolor{rulegray}{gray}{0.72}
\\definecolor{mutedink}{gray}{0.35}

\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}

\\titleformat{\\section}
  {\\normalsize\\bfseries\\scshape}{}{0pt}{}
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
\\newcolumntype{L}{>{\\raggedright\\arraybackslash}X}
\\renewcommand{\\arraystretch}{1}

\\newcommand{\\entry}[2]{%
  \\noindent\\begin{tabularx}{\\linewidth}{@{}L@{\\hspace{1em}}r@{}}
    \\textbf{#1} & {\\small\\color{mutedink}#2}
  \\end{tabularx}\\par
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

const experience = (data, variant) =>
  data.experience
    .map(role => {
      // The full CV carries the per-role skill list; on the one-pager that is
      // six extra lines saying what the bullets already said.
      const skills =
        variant === 'full' && role.skills && role.skills.length > 0
          ? `\\vspace{0.15em}{\\small\\color{mutedink}Skills: ${tex(role.skills.join(', '))}}\\par\n`
          : '';

      const description =
        variant === 'full' && role.description
          ? `{\\small\\itshape ${tex(role.description)}}\\par\n`
          : '';

      const bullets = role.achievements
        .map(item => `  \\item ${tex(item)}`)
        .join('\n');

      return `\\entry{${tex(role.title)}, ${tex(role.company)}}{${tex(role.location)}${SEPARATOR}${tex(role.duration)}}
${description}\\begin{points}
${bullets}
\\end{points}
${skills}\\vspace{\\rolesep}
`;
    })
    .join('\n');

const education = (data, variant) =>
  data.education
    .map(entry => {
      const parts = [];

      if (entry.gpa) parts.push(`{\\small GPA: ${tex(entry.gpa)}}\\par`);
      if (entry.description)
        parts.push(`{\\small ${tex(entry.description)}}\\par`);

      // Coursework is the first thing to go when the page has to fit.
      if (
        variant === 'full' &&
        entry.relevantCoursework &&
        entry.relevantCoursework.length > 0
      ) {
        parts.push(
          `{\\small\\color{mutedink}Coursework: ${tex(entry.relevantCoursework.join(', '))}}\\par`
        );
      }

      if (entry.achievements && entry.achievements.length > 0) {
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
  if (variant === 'full' && data.skills.soft && data.skills.soft.length > 0) {
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
  const sections = [
    header(data),
    `\\section{Summary}\n${tex(data.personal.summary)}\\par\n`,
    `\\section{Experience}\n${experience(data, variant)}`,
    `\\section{Education}\n${education(data, variant)}`,
    `\\section{Skills}\n${skills(data, variant)}\n`,
  ];

  if (
    variant === 'full' &&
    data.certifications &&
    data.certifications.length > 0
  ) {
    sections.push(`\\section{Certifications}\n${certifications(data)}`);
  }

  return `${preamble(variant)}
\\begin{document}
${sections.join('\n')}
\\end{document}
`;
};

module.exports = { renderResumeTex, tex };
