import React from 'react';
import { CVData, CVVariant, CV_PAGES, isRoleVariant } from '../../config/cv';
import ControlRow from '../ui/ControlRow';
import Dropdown, { DropdownOption } from '../ui/Dropdown';
import { DownloadIcon } from '../ui/EntryIcons';
import useCVExport, { CVExportFormat } from './useCVExport';

const VIEW_OPTIONS: DropdownOption[] = [
  { value: 'full', label: 'full cv' },
  { value: 'resume', label: 'one page' },
];

// What a role page adds to the menu: its own entry, so the row reads the same
// as /cv/'s with the page you are on selected. /cv/ itself lists only the two
// lengths — the role pages are unlisted, and its menu is the one everyone sees.
// The entry's label is the page's own, from src/config/cv-pages.json.
const roleOptionFor = (view: CVVariant): DropdownOption | undefined =>
  isRoleVariant(view)
    ? { value: view, label: CV_PAGES[view].label }
    : undefined;

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
   * draws no menu at all, only the download menu.
   */
  onViewChange?: (view: CVVariant) => void;
  className?: string;
}

/**
 * The CV's one row of chrome: pick a length, take the document away, and
 * nothing else. It is the row every list page carries (see ControlRow): what
 * is shown at the start, what can be taken away at the far end. It has no
 * search of its own — the site's one search is in the capsule of page links,
 * and it finds a role by what was done in it.
 */
const CVControlBar: React.FC<CVControlBarProps> = ({
  resumeData,
  view,
  onViewChange,
  className = '',
}) => {
  const { isExporting, exportAs } = useCVExport(resumeData, view);

  const roleOption = roleOptionFor(view);
  const viewOptions = roleOption ? [...VIEW_OPTIONS, roleOption] : VIEW_OPTIONS;
  const viewLabel =
    viewOptions.find(option => option.value === view)?.label ?? 'full cv';

  return (
    <ControlRow
      className={`cv-control-bar ${className}`.trim()}
      actions={
        // The verb is the mark: one tray-and-arrow, the same one a post wears
        // over its typeset copy. The menu underneath still names the three
        // formats in words — the icon says "take it away", not which file.
        <Dropdown
          ariaLabel="Download the CV"
          triggerIcon={<DownloadIcon />}
          busy={isExporting}
          options={DOWNLOAD_OPTIONS}
          onSelect={value => exportAs(value as CVExportFormat)}
          align="end"
          tone="action"
          className="cv-download-dropdown"
        />
      }
    >
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
    </ControlRow>
  );
};

export default CVControlBar;
