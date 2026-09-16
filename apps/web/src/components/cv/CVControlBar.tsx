import React from 'react';
import { CVData, CVVariant } from '../../config/cv';
import ControlRow from '../ui/ControlRow';
import Dropdown, { DropdownOption } from '../ui/Dropdown';
import { DownloadIcon } from '../ui/EntryIcons';
import SearchToggle from '../ui/SearchToggle';
import useCVExport, { CVExportFormat } from './useCVExport';

const VIEW_OPTIONS: DropdownOption[] = [
  { value: 'full', label: 'full cv' },
  { value: 'resume', label: 'one page' },
];

// What a role page adds to the menu: its own entry, so the row reads the same
// as /cv/'s with the page you are on selected. /cv/ itself lists only the two
// lengths — the role pages are unlisted, and its menu is the one everyone sees.
const ROLE_OPTIONS: Partial<Record<CVVariant, DropdownOption>> = {
  fde: { value: 'fde', label: 'fde' },
  'ai-engineer': { value: 'ai-engineer', label: 'ai engineer' },
};

const DOWNLOAD_OPTIONS: DropdownOption[] = [
  // The trigger already says "download" — the options are just the formats.
  { value: 'pdf', label: 'pdf' },
  { value: 'docx', label: 'docx' },
  { value: 'markdown', label: 'markdown' },
];

interface CVControlBarProps {
  resumeData: CVData;
  /** Which variant is on screen; picks the PDF artifact and the DOCX layout. */
  view: CVVariant;
  /**
   * Called when a document is picked from the menu. On /cv/ it switches the
   * length in place; on a role page it navigates. Leave it out and the row
   * draws no menu at all, only the download menu and the search chip.
   */
  onViewChange?: (view: CVVariant) => void;
  /** Phone only: the search panel below is folded away behind a chip here. */
  searchOpen?: boolean;
  onToggleSearch?: () => void;
  className?: string;
}

/**
 * The CV's one row of chrome: pick a length, take the document away, and
 * nothing else — the search is a place to type rather than a control, and it
 * stays in its own panel below. The row is the one every list page carries:
 * two menus on the left and, on a phone, the chip that unfolds the search
 * panel at the far right. The row sticks to the
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

  const roleOption = ROLE_OPTIONS[view];
  const viewOptions = roleOption ? [...VIEW_OPTIONS, roleOption] : VIEW_OPTIONS;
  const viewLabel =
    viewOptions.find(option => option.value === view)?.label ?? 'full cv';

  return (
    <ControlRow className={`cv-control-bar ${className}`.trim()}>
      {onViewChange && (
        <Dropdown
          ariaLabel="Choose CV length"
          triggerLabel={viewLabel}
          options={viewOptions}
          value={view}
          onSelect={value => onViewChange(value as CVVariant)}
          className="cv-view-dropdown"
        />
      )}

      {/* The verb is the mark: one tray-and-arrow, the same one a post wears
          over its typeset copy. The menu underneath still names the three
          formats in words — the icon says "take it away", not which file. */}
      <Dropdown
        ariaLabel="Download the CV"
        triggerIcon={<DownloadIcon />}
        busy={isExporting}
        options={DOWNLOAD_OPTIONS}
        onSelect={value => exportAs(value as CVExportFormat)}
        tone="action"
        className="cv-download-dropdown"
      />

      {/* At the far end, as on the blog and projects rows: the two menus sit
          left and the way to the search box takes the right. */}
      {onToggleSearch && (
        <SearchToggle
          open={searchOpen}
          onToggle={onToggleSearch}
          controls="cv-search"
        />
      )}
    </ControlRow>
  );
};

export default CVControlBar;
