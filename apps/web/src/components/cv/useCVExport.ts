import { useCallback, useState } from 'react';
import { CVData } from '../../config/cv';
import type { CVVariant } from '../../lib/utils/export/docx';
import { exportCVAsMarkdown } from '../../lib/utils/export/markdown';
import { downloadMarkdown } from '../../lib/utils/export/utils';

// The PDFs are typeset by LaTeX at build time rather than generated in the
// browser — see scripts/build-cv.js — so "download pdf" is a plain fetch of
// the artifact for whichever length is on screen.
export const CV_PDF_ARTIFACTS: Record<CVVariant, string> = {
  resume: '/cv/alex-nodeland-resume.pdf',
  full: '/cv/alex-nodeland-cv.pdf',
};

/** `Alex Nodeland` + `docx` → `Alex_Nodeland_Resume.docx`. */
export const cvExportFilename = (resumeData: CVData, extension: string) =>
  `${resumeData.personal.name.replace(/\s+/g, '_')}_Resume.${extension}`;

export type CVExportFormat = 'pdf' | 'docx' | 'markdown';

export interface CVExportApi {
  /** The static artifact the current variant's PDF lives at. */
  pdfHref: string;
  /** True while the DOCX is being assembled — the only slow export. */
  isExporting: boolean;
  exportPDF: () => void;
  exportDOCX: () => Promise<void>;
  exportMarkdown: () => void;
  /** Dispatch by name, for callers driven by a menu rather than one button each. */
  exportAs: (format: CVExportFormat) => void | Promise<void>;
}

/**
 * The three downloads the CV offers, lifted out of the old export-button panel
 * so the control-bar dropdown — or anything else — can call them directly
 * instead of re-implementing the filenames and the error handling.
 */
export const useCVExport = (
  resumeData: CVData,
  variant: CVVariant = 'full'
): CVExportApi => {
  const [isExporting, setIsExporting] = useState(false);

  const pdfHref = CV_PDF_ARTIFACTS[variant];

  // The PDF used to be an `<a download>` in the row. As a menu item it is a
  // button like the other two, so the anchor is synthesised here — same
  // shape as downloadMarkdown's, minus the blob.
  const exportPDF = useCallback(() => {
    const link = document.createElement('a');
    link.href = pdfHref;
    link.download = pdfHref.split('/').pop() || 'cv.pdf';
    if (document.body && typeof document.body.appendChild === 'function') {
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      link.click();
    }
  }, [pdfHref]);

  const exportDOCX = useCallback(async () => {
    setIsExporting(true);
    try {
      // The DOCX builder is the heaviest thing on the page — docx and its zip
      // library, ~90KB gzipped — and it is wanted once per download at most,
      // so it is fetched here rather than shipped with every page.
      const { exportCVAsDOCX } = await import('../../lib/utils/export/docx');
      await exportCVAsDOCX(
        resumeData,
        cvExportFilename(resumeData, 'docx'),
        variant
      );
    } catch (error) {
      console.error('DOCX export failed:', error);
      alert(
        `Failed to export DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsExporting(false);
    }
  }, [resumeData, variant]);

  const exportMarkdown = useCallback(() => {
    try {
      const markdown = exportCVAsMarkdown(resumeData);
      downloadMarkdown(markdown, cvExportFilename(resumeData, 'md'));
    } catch (error) {
      console.error('Markdown export failed:', error);
      alert('Failed to export Markdown. Please try again.');
    }
  }, [resumeData]);

  const exportAs = useCallback(
    (format: CVExportFormat) => {
      switch (format) {
        case 'pdf':
          return exportPDF();
        case 'docx':
          return exportDOCX();
        case 'markdown':
          return exportMarkdown();
      }
    },
    [exportPDF, exportDOCX, exportMarkdown]
  );

  return {
    pdfHref,
    isExporting,
    exportPDF,
    exportDOCX,
    exportMarkdown,
    exportAs,
  };
};

export default useCVExport;
