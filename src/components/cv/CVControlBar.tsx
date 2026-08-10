import React from 'react';
import { CVData } from '../../config/cv';
import { CVVariant } from '../../lib/utils/export';
import CVDropdown, { CVDropdownOption } from './CVDropdown';
import useCVExport, { CVExportFormat } from './useCVExport';

const VIEW_OPTIONS: CVDropdownOption[] = [
  { value: 'full', label: 'full cv' },
  { value: 'resume', label: 'one page' },
];

const DOWNLOAD_OPTIONS: CVDropdownOption[] = [
  // The trigger already says "download" — the options are just the formats.
  { value: 'pdf', label: 'pdf' },
  { value: 'docx', label: 'docx' },
  { value: 'markdown', label: 'markdown' },
];

interface CVControlBarProps {
  resumeData: CVData;
  /** Which length is on screen; picks the PDF artifact and the DOCX layout. */
  view: CVVariant;
  onViewChange: (view: CVVariant) => void;
  className?: string;
}

/**
 * The CV's one row of chrome: pick a length on the left, take the document
 * away on the right, and nothing else — the search is a place to type rather
 * than a control, and it stays in its own panel below. The row sticks to the
 * top of the window's own scroll, so — like the section nav that used to live
 * here — it cannot be a pure outline: the document runs underneath it, and it
 * takes the window's scrim, blur and hairline so headings do not read straight
 * through it.
 */
const CVControlBar: React.FC<CVControlBarProps> = ({
  resumeData,
  view,
  onViewChange,
  className = '',
}) => {
  const { isExporting, exportAs } = useCVExport(resumeData, view);

  const viewLabel =
    VIEW_OPTIONS.find(option => option.value === view)?.label ?? 'full cv';

  return (
    <div className={`cv-control-bar ${className}`.trim()}>
      <CVDropdown
        ariaLabel="Choose CV length"
        triggerLabel={viewLabel}
        options={VIEW_OPTIONS}
        value={view}
        onSelect={value => onViewChange(value as CVVariant)}
        className="cv-view-dropdown"
      />

      <CVDropdown
        ariaLabel="Download the CV"
        triggerLabel={isExporting ? 'generating...' : 'download'}
        options={DOWNLOAD_OPTIONS}
        onSelect={value => exportAs(value as CVExportFormat)}
        align="end"
        tone="action"
        className="cv-download-dropdown"
      />
    </div>
  );
};

export default CVControlBar;
