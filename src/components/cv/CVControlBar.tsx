import React from 'react';
import { CVData } from '../../config/cv';
import type { CVVariant } from '../../lib/utils/export/docx';
import Dropdown, { DropdownOption } from '../ui/Dropdown';
import SearchToggle from '../ui/SearchToggle';
import useCVExport, { CVExportFormat } from './useCVExport';

const VIEW_OPTIONS: DropdownOption[] = [
  { value: 'full', label: 'full cv' },
  { value: 'resume', label: 'one page' },
];

const DOWNLOAD_OPTIONS: DropdownOption[] = [
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
  /** Phone only: the search panel below is folded away behind a chip here. */
  searchOpen?: boolean;
  onToggleSearch?: () => void;
  className?: string;
}

/**
 * The CV's one row of chrome: pick a length on the left, take the document
 * away on the right, and nothing else — the search is a place to type rather
 * than a control, and it stays in its own panel below. On a phone the chip
 * that unfolds that panel takes the same seat it has on the blog and projects
 * rows: last, at the far end. The row sticks to the
 * top of the window's own scroll, so — like the section nav that used to live
 * here — it cannot be a pure outline: the document runs underneath it, and it
 * takes the window's scrim, blur and hairline so headings do not read straight
 * through it.
 */
const CVControlBar: React.FC<CVControlBarProps> = ({
  resumeData,
  view,
  onViewChange,
  searchOpen = false,
  onToggleSearch,
  className = '',
}) => {
  const { isExporting, exportAs } = useCVExport(resumeData, view);

  const viewLabel =
    VIEW_OPTIONS.find(option => option.value === view)?.label ?? 'full cv';

  return (
    <div className={`cv-control-bar ${className}`.trim()}>
      <Dropdown
        ariaLabel="Choose CV length"
        triggerLabel={viewLabel}
        options={VIEW_OPTIONS}
        value={view}
        onSelect={value => onViewChange(value as CVVariant)}
        className="cv-view-dropdown"
      />

      <Dropdown
        ariaLabel="Download the CV"
        triggerLabel={isExporting ? 'generating...' : 'download'}
        options={DOWNLOAD_OPTIONS}
        onSelect={value => exportAs(value as CVExportFormat)}
        align="end"
        tone="action"
        className="cv-download-dropdown"
      />

      {/* Last in the row, at the far end, as it is on the blog and projects
          rows: the pickers sit left, the action is pushed right, and the way
          to the search box comes after it. */}
      {onToggleSearch && (
        <SearchToggle
          open={searchOpen}
          onToggle={onToggleSearch}
          controls="cv-search"
        />
      )}
    </div>
  );
};

export default CVControlBar;
