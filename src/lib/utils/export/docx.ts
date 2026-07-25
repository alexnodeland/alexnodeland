import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import {
  CertificationItem,
  CVData,
  EducationItem,
  ExperienceItem,
} from '../../../config/cv';

/**
 * Word export, laid out to match `templates/cv/resume.tex.js`.
 *
 * The PDF is typeset by LaTeX in the build (see `scripts/build-cv.js`); Word
 * has no equivalent to hand a .tex to, so this is the template, expressed in
 * docx.js. The two are kept deliberately parallel — same sections in the same
 * order, same one-line entry heading with place and dates on the right rail,
 * same things dropped from the one-pager — so a change to one has an obvious
 * counterpart in the other.
 *
 * Units follow the OOXML conventions docx.js exposes: font sizes in
 * half-points, everything else in twips (1 inch = 1440).
 */

export type CVVariant = 'resume' | 'full';

const LETTER = { width: 12240, height: 15840 };

const SEPARATOR = ' · ';
const MUTED = '595959';
const RULE = 'B8B8B8';

/**
 * Width reserved for the place-and-dates rail, sized for the longest string
 * either variant produces — "Stony Brook University · 2016 - (Incomplete)".
 */
const RIGHT_RAIL = 3700;

interface Metrics {
  margin: number;
  textWidth: number;
  /** Left column of the entry heading: whatever the rail leaves. */
  entryLeft: number;
  body: number;
  entry: number;
  meta: number;
  entrySpacing: number;
  bulletSpacing: number;
}

const metricsFor = (variant: CVVariant): Metrics => {
  const margin = variant === 'resume' ? 792 : 1296; // 0.55in / 0.9in
  const textWidth = LETTER.width - margin * 2;
  return {
    margin,
    textWidth,
    entryLeft: textWidth - RIGHT_RAIL,
    body: variant === 'resume' ? 20 : 22,
    entry: variant === 'resume' ? 21 : 23,
    meta: 18,
    entrySpacing: variant === 'resume' ? 120 : 220,
    bulletSpacing: variant === 'resume' ? 20 : 60,
  };
};

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
};
const NO_MARGINS = { top: 0, bottom: 0, left: 0, right: 0 };

/**
 * A section heading, kept with whatever follows it.
 *
 * `keepNext` is Word's counterpart to the `\needspace` guard in
 * `templates/cv/resume.tex.js`: a heading stranded at the foot of a page with
 * its content overleaf reads as a mistake. Both are generic — every heading
 * gets it, not just the one where the break happened to land.
 */
const sectionHeading = (text: string, m: Metrics) =>
  new Paragraph({
    children: [
      new TextRun({ text: text.toUpperCase(), bold: true, size: m.meta + 2 }),
    ],
    spacing: { before: 240, after: 80 },
    keepNext: true,
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 2 },
    },
  });

/**
 * Title on the left, place and dates on the right, on one line.
 *
 * A borderless two-column table rather than a right tab stop. A tab stop is
 * the obvious construct and it is what this used to be, but it fails twice
 * over: docx.js only emits a real `<w:tab/>` for an explicit `Tab` element, so
 * a `\t` in the run text lands in Word as ordinary whitespace and nothing
 * aligns at all — and even done correctly, a title long enough to reach the
 * stop pushes the whole date onto the next line. Fixed columns right-align
 * unconditionally, and a long title wraps inside its own column.
 */
const entryHeading = (left: string, right: string, m: Metrics) =>
  new Table({
    width: { size: m.textWidth, type: WidthType.DXA },
    columnWidths: [m.entryLeft, RIGHT_RAIL],
    layout: TableLayoutType.FIXED,
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: m.entryLeft, type: WidthType.DXA },
            margins: NO_MARGINS,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: left, bold: true, size: m.entry }),
                ],
                spacing: { after: 0 },
                keepNext: true,
              }),
            ],
          }),
          new TableCell({
            width: { size: RIGHT_RAIL, type: WidthType.DXA },
            margins: NO_MARGINS,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: right, size: m.meta, color: MUTED }),
                ],
                spacing: { after: 0 },
                keepNext: true,
              }),
            ],
          }),
        ],
      }),
    ],
  });

const bullet = (text: string, m: Metrics) =>
  new Paragraph({
    children: [new TextRun({ text, size: m.body })],
    bullet: { level: 0 },
    spacing: { after: m.bulletSpacing },
  });

const note = (text: string, m: Metrics, italics = false) =>
  new Paragraph({
    children: [new TextRun({ text, size: m.meta, italics, color: MUTED })],
    spacing: { after: 40 },
  });

const header = (cvData: CVData, m: Metrics) => {
  const { name, title, location, email, website, phone } = cvData.personal;
  const contact = [location, email, website, phone].filter(Boolean);

  return [
    new Paragraph({
      children: [new TextRun({ text: name, bold: true, size: 40 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: title, italics: true, size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: contact.join(SEPARATOR), size: m.meta })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: cvData.personal.summary, size: m.body })],
      spacing: { after: 60 },
    }),
  ];
};

type Block = Paragraph | Table;

const experience = (cvData: CVData, variant: CVVariant, m: Metrics): Block[] =>
  cvData.experience.flatMap((exp: ExperienceItem) => [
    entryHeading(
      `${exp.title}, ${exp.company}`,
      `${exp.location}${SEPARATOR}${exp.duration}`,
      m
    ),
    // Six extra lines on the one-pager restating what the bullets already say.
    ...(variant === 'full' && exp.description
      ? [note(exp.description, m, true)]
      : []),
    ...exp.achievements.map(achievement => bullet(achievement, m)),
    ...(variant === 'full' && exp.skills && exp.skills.length > 0
      ? [note(`Skills: ${exp.skills.join(', ')}`, m)]
      : []),
    new Paragraph({ children: [], spacing: { after: m.entrySpacing } }),
  ]);

const education = (cvData: CVData, variant: CVVariant, m: Metrics): Block[] =>
  cvData.education.flatMap((edu: EducationItem) => [
    entryHeading(
      edu.degree,
      `${edu.institution}${SEPARATOR}${edu.duration}`,
      m
    ),
    ...(edu.gpa ? [note(`GPA: ${edu.gpa}`, m)] : []),
    ...(edu.description ? [note(edu.description, m)] : []),
    // Coursework is the first thing to go when the page has to fit.
    ...(variant === 'full' &&
    edu.relevantCoursework &&
    edu.relevantCoursework.length > 0
      ? [note(`Coursework: ${edu.relevantCoursework.join(', ')}`, m)]
      : []),
    ...(edu.achievements ?? []).map(achievement => bullet(achievement, m)),
    new Paragraph({ children: [], spacing: { after: m.entrySpacing } }),
  ]);

const skillsBlock = (
  cvData: CVData,
  variant: CVVariant,
  m: Metrics
): Paragraph[] => {
  const line = (label: string, items: string[]) =>
    new Paragraph({
      children: [
        new TextRun({ text: `${label}  `, bold: true, size: m.body }),
        new TextRun({ text: items.join(', '), size: m.body }),
      ],
      spacing: { after: 60 },
    });

  return [
    line('Technical', cvData.skills.technical),
    // Soft skills read as filler beside fifteen achievement bullets.
    ...(variant === 'full' &&
    cvData.skills.soft &&
    cvData.skills.soft.length > 0
      ? [line('Soft', cvData.skills.soft)]
      : []),
    ...(cvData.skills.languages && cvData.skills.languages.length > 0
      ? [line('Languages', cvData.skills.languages)]
      : []),
  ];
};

/**
 * Builds the Word document for `cvData`.
 *
 * `variant` decides how much is on the page: `resume` is the one-pager and
 * drops per-role skills, coursework, soft skills and certifications; `full`
 * keeps everything.
 */
export const buildCVDocument = (
  cvData: CVData,
  variant: CVVariant = 'full'
): Document => {
  const m = metricsFor(variant);

  const children: Block[] = [
    ...header(cvData, m),
    sectionHeading('Experience', m),
    ...experience(cvData, variant, m),
    sectionHeading('Education', m),
    ...education(cvData, variant, m),
    sectionHeading('Skills', m),
    ...skillsBlock(cvData, variant, m),
  ];

  if (
    variant === 'full' &&
    cvData.certifications &&
    cvData.certifications.length > 0
  ) {
    children.push(
      sectionHeading('Certifications', m),
      ...cvData.certifications.map((cert: CertificationItem) =>
        bullet(`${cert.name}, ${cert.issuer} (${cert.date})`, m)
      )
    );
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: m.body },
          paragraph: { spacing: { line: 240 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: LETTER,
            margin: {
              top: m.margin,
              right: m.margin,
              bottom: m.margin,
              left: m.margin,
            },
          },
        },
        children,
      },
    ],
  });
};

// Export CV as DOCX
export const exportCVAsDOCX = async (
  cvData: CVData,
  filename: string = 'resume.docx',
  variant: CVVariant = 'full'
) => {
  try {
    const doc = buildCVDocument(cvData, variant);
    const arrayBuffer = await Packer.toArrayBuffer(doc);
    const blob = new Blob([arrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    saveAs(blob, filename);
  } catch (error) {
    console.error('Error generating DOCX:', error);
    throw error;
  }
};
