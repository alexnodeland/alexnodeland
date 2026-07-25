// CV Export functionality - barrel exports for cleaner imports
//
// There is no PDF exporter here on purpose. The PDFs are typeset by LaTeX at
// build time (scripts/build-cv.js) and served from static/cv/; the CV page
// links straight at those files. See docs/cv-management.md.

// DOCX export
export { buildCVDocument, exportCVAsDOCX } from './docx';
export type { CVVariant } from './docx';

// Markdown export
export { exportCVAsMarkdown } from './markdown';

// Shared utilities
export { downloadMarkdown } from './utils';
