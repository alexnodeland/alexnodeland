import { navigate } from 'gatsby';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BackgroundSettings,
  SettingsSchema,
} from '../../types/animated-backgrounds';
import CloseIcon from '../ui/CloseIcon';
import { useIsMobileViewport } from './core/useIsMobileViewport';

interface SettingsPanelProps {
  settings: BackgroundSettings;
  settingsSchema: SettingsSchema[];
  onSettingsChange: (newSettings: BackgroundSettings) => void;
  onResetSettings?: () => void;
  onClose: () => void;
  // Background info for sidebar header
  currentBackgroundId: string;
  currentBackgroundName: string;
  currentBackgroundDescription: string;
  currentBackgroundBlogPostSection?: string;
  totalBackgrounds: number;
  onPreviousBackground: () => void;
  onNextBackground: () => void;
  isClosing: boolean;
  // Audio playback functions for special controls
  onStartAudio?: () => void;
  onStopAudio?: () => void;
  isAudioPlaying?: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  settingsSchema,
  onSettingsChange,
  onResetSettings,
  onClose,
  currentBackgroundId,
  currentBackgroundName,
  currentBackgroundDescription,
  currentBackgroundBlogPostSection,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  totalBackgrounds,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onPreviousBackground,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onNextBackground,
  isClosing,
  onStartAudio,
  onStopAudio,
  isAudioPlaying,
}) => {
  // Define which categories are considered standard across all backgrounds
  const STANDARD_CATEGORY_ORDER = useMemo(
    () => ['Visual', 'Animation', 'Colors'],
    []
  );
  const STANDARD_CATEGORIES = useMemo(
    () => new Set<string>(STANDARD_CATEGORY_ORDER),
    [STANDARD_CATEGORY_ORDER]
  );

  // Group settings by category
  const settingsByCategory = useMemo(() => {
    return settingsSchema.reduce(
      (acc, setting) => {
        const category = setting.category || 'Other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(setting);
        return acc;
      },
      {} as Record<string, SettingsSchema[]>
    );
  }, [settingsSchema]);

  // Partition categories into custom (top) and standard (bottom)
  const { customCategories, standardCategories } = useMemo(() => {
    const allCategoryNames = Object.keys(settingsByCategory);
    const custom: string[] = [];
    const standard: string[] = [];
    for (const name of allCategoryNames) {
      if (STANDARD_CATEGORIES.has(name)) {
        standard.push(name);
      } else {
        custom.push(name);
      }
    }
    // Sort standard categories using fixed order
    const standardSorted = [...standard].sort((a, b) => {
      return (
        STANDARD_CATEGORY_ORDER.indexOf(a) - STANDARD_CATEGORY_ORDER.indexOf(b)
      );
    });
    return { customCategories: custom, standardCategories: standardSorted };
  }, [settingsByCategory, STANDARD_CATEGORIES, STANDARD_CATEGORY_ORDER]);

  // Phones get a flat, one-category-at-a-time layout instead of the desktop's
  // section > accordion > rows nesting: two levels of disclosure inside a
  // hand-sized sheet is mostly chrome, and every tap costs a scroll.
  const isMobile = useIsMobileViewport();

  const orderedCategories = useMemo(
    () => [...customCategories, ...standardCategories],
    [customCategories, standardCategories]
  );

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  // What a `?` beside a setting has to say, and where on the panel to say it.
  //
  // A popover rather than a tooltip inside the row, because the row is inside
  // the list and the list scrolls: anchored there it was clipped by its own
  // scroller for every control that was not in the middle of the visible band,
  // and on a phone — where the visible band can be a couple of rows — that was
  // all of them. It also could not be opened at all by touch, being shown on
  // hover. So it is one box, a sibling of the scroller rather than a descendant
  // of it, placed against the mark that asked for it.
  const panelRef = useRef<HTMLDivElement>(null);
  const [help, setHelp] = useState<{
    key: string;
    text: string;
    below: boolean;
    offset: number;
    room: number;
  } | null>(null);

  // Switching backgrounds swaps the whole category set out from under us.
  useEffect(() => {
    setActiveCategory(current =>
      current && orderedCategories.includes(current)
        ? current
        : (orderedCategories[0] ?? null)
    );
  }, [orderedCategories]);

  useEffect(() => {
    setDescriptionOpen(false);
  }, [currentBackgroundId]);

  // Track open/closed per-category; default: all categories closed
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    {}
  );

  // Initialize/merge open state when schema changes (e.g., switching backgrounds)
  useEffect(() => {
    setOpenCategories(prev => {
      const next: Record<string, boolean> = { ...prev };
      for (const name of customCategories) {
        if (next[name] === undefined) next[name] = false;
      }
      for (const name of standardCategories) {
        if (next[name] === undefined) next[name] = false;
      }
      return next;
    });
  }, [customCategories, standardCategories]);

  // Helper function to get nested property value
  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  // Helper function to set nested property value
  const setNestedValue = (obj: any, path: string, value: any): any => {
    const keys = path.split('.');
    const result = { ...obj };
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      current[key] = { ...current[key] };
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    return result;
  };

  // Handle setting change
  const handleSettingChange = useCallback(
    (key: string, value: any) => {
      const newSettings = setNestedValue(settings, key, value);
      onSettingsChange(newSettings);
    },
    [settings, onSettingsChange]
  );

  // Convert RGB array to hex color
  const rgbToHex = (rgb: [number, number, number]): string => {
    const toHex = (n: number) =>
      Math.round(n * 255)
        .toString(16)
        .padStart(2, '0');
    return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
  };

  // Convert hex color to RGB array
  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ];
    }
    return [0, 0, 0];
  };

  // Toggle category
  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Collapse/expand helpers (VS Code-style controls)
  const collapseAllCustom = () => {
    setOpenCategories(prev => {
      const updated = { ...prev };
      customCategories.forEach(c => {
        updated[c] = false;
      });
      return updated;
    });
  };

  const expandAllCustom = () => {
    setOpenCategories(prev => {
      const updated = { ...prev };
      customCategories.forEach(c => {
        updated[c] = true;
      });
      return updated;
    });
  };

  const collapseAllStandard = () => {
    setOpenCategories(prev => {
      const updated = { ...prev };
      standardCategories.forEach(c => {
        updated[c] = false;
      });
      return updated;
    });
  };

  const expandAllStandard = () => {
    setOpenCategories(prev => {
      const updated = { ...prev };
      standardCategories.forEach(c => {
        updated[c] = true;
      });
      return updated;
    });
  };

  // Section computed states: if any open => show down chevron; if none open => right chevron
  const customAnyOpen = useMemo(
    () => customCategories.some(c => !!openCategories[c]),
    [customCategories, openCategories]
  );
  const standardAnyOpen = useMemo(
    () => standardCategories.some(c => !!openCategories[c]),
    [standardCategories, openCategories]
  );

  const toggleCustomSection = () => {
    if (customAnyOpen) {
      collapseAllCustom();
    } else {
      expandAllCustom();
    }
  };

  const toggleStandardSection = () => {
    if (standardAnyOpen) {
      collapseAllStandard();
    } else {
      expandAllStandard();
    }
  };

  // Open the note for one setting, measured against the panel it lands on.
  //
  // Both numbers are in the panel's own coordinates, since that is what the
  // popover is positioned in — the sheet carries a backdrop filter, which makes
  // it the containing block for anything fixed inside it anyway. It goes above
  // the mark where there is room above and below it where there is not, so it
  // is never the thing that runs off the panel.
  const openHelp = useCallback((key: string, text: string, mark: Element) => {
    const panel = panelRef.current;
    if (!panel) return;
    setHelp(current => {
      if (current?.key === key) return null;
      const box = mark.getBoundingClientRect();
      const frame = panel.getBoundingClientRect();
      const above = box.top - frame.top;
      const under = frame.bottom - box.bottom;
      const below = under > above;
      // Anchored to the edge it grows away from — `top` when it hangs below the
      // mark, `bottom` when it stands above it — so the note can only ever run
      // out of room in the one direction the cap covers. Positioning it by one
      // edge and translating it the other way needs its height, which does not
      // exist until it has been laid out.
      return {
        key,
        text,
        below,
        offset: below ? box.bottom - frame.top + 8 : frame.bottom - box.top + 8,
        room: (below ? under : above) - 16,
      };
    });
  }, []);

  const closeHelp = useCallback(() => setHelp(null), []);

  // Everything that means "not that any more": another background, the panel
  // closing, a key, or a tap anywhere that is not the note or the mark that
  // opened it. The list scrolling counts too — the mark it is pointing at has
  // moved out from under it.
  useEffect(() => {
    if (!help) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // The note is the innermost thing open, so Escape is its. Without this
      // the key went straight past it to the shell's own handler and shut the
      // whole panel — one press, two things dismissed, and the reader back on
      // the field wondering what happened. A second press still closes the
      // panel, which is what a second press should do.
      event.stopPropagation();
      closeHelp();
    };
    const onPointer = (event: Event) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest('.setting-help, .setting-note')
      )
        return;
      closeHelp();
    };
    const scroller = panelRef.current?.querySelector('.settings-content');
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer, true);
    // On the next frame, not this one: opening the note changes the panel's
    // layout, and a list whose box has just changed can emit a scroll of its
    // own — which would have closed the note in the frame it opened in.
    const armed = requestAnimationFrame(() =>
      scroller?.addEventListener('scroll', closeHelp, { passive: true })
    );
    return () => {
      cancelAnimationFrame(armed);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer, true);
      scroller?.removeEventListener('scroll', closeHelp);
    };
  }, [help, closeHelp]);

  useEffect(() => {
    setHelp(null);
  }, [currentBackgroundId, activeCategory]);

  // The description gets out of the way the moment the reader goes looking for
  // a setting. It is the longest thing in the sheet and it is read once; the
  // controls under it are the reason the sheet is open at all.
  useEffect(() => {
    if (!descriptionOpen) return;
    const scroller = panelRef.current?.querySelector('.settings-content');
    if (!scroller) return;
    const close = () => setDescriptionOpen(false);
    // The gesture rather than the scroll it causes. Opening the description
    // takes height away from the list under it, and a list that has just been
    // resized emits a scroll on its own — which closed the description in the
    // frame it opened in. A finger and a wheel are only ever the reader.
    scroller.addEventListener('wheel', close, { passive: true });
    scroller.addEventListener('touchmove', close, { passive: true });
    return () => {
      scroller.removeEventListener('wheel', close);
      scroller.removeEventListener('touchmove', close);
    };
  }, [descriptionOpen]);

  const renderSettingInput = (setting: SettingsSchema) => {
    const value = getNestedValue(settings, setting.key);

    switch (setting.type) {
      case 'slider': {
        // Dynamic bounds for settings that depend on other settings
        let dynamicMin = setting.min;
        let dynamicMax = setting.max;
        if (setting.key === 'spStartNode' || setting.key === 'spGoalNode') {
          const total = (settings as any).spTotalNodes ?? 0;
          dynamicMin = 0;
          dynamicMax = Math.max(0, (typeof total === 'number' ? total : 0) - 1);
        }
        const clampedValue = Math.max(
          dynamicMin ?? Number.NEGATIVE_INFINITY,
          Math.min(dynamicMax ?? Number.POSITIVE_INFINITY, value ?? 0)
        );
        return (
          <div className="setting-input">
            <input
              type="range"
              min={dynamicMin}
              max={dynamicMax}
              step={setting.step}
              value={clampedValue}
              onChange={e =>
                handleSettingChange(setting.key, parseFloat(e.target.value))
              }
              className="slider"
            />
            <span className="setting-value">{clampedValue?.toFixed?.(3)}</span>
          </div>
        );
      }

      case 'number':
        return (
          <div className="setting-input">
            <input
              type="number"
              min={setting.min}
              max={setting.max}
              step={setting.step}
              value={value}
              onChange={e =>
                handleSettingChange(setting.key, parseFloat(e.target.value))
              }
              className="number-input"
            />
          </div>
        );

      case 'color':
        return (
          <div className="setting-input">
            <input
              type="color"
              value={rgbToHex(value)}
              onChange={e =>
                handleSettingChange(setting.key, hexToRgb(e.target.value))
              }
              className="color-input"
            />
            <span className="color-value">{rgbToHex(value)}</span>
          </div>
        );

      case 'select':
        return (
          <div className="setting-input">
            <select
              value={String(value)}
              // A DOM select only ever hands back a string. Several schemas
              // declare boolean or numeric option values, and storing "false"
              // for them is worse than useless — it is truthy, so the "no"
              // choice reads as yes. Map the selection back to the value the
              // schema actually declared.
              onChange={e => {
                const chosen = setting.options?.find(
                  option => String(option.value) === e.target.value
                );
                handleSettingChange(
                  setting.key,
                  chosen ? chosen.value : e.target.value
                );
              }}
              className="select-input"
            >
              {setting.options?.map(option => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label?.toLowerCase?.() || ''}
                </option>
              ))}
            </select>
          </div>
        );

      default:
        return null;
    }
  };

  const renderSettingRow = (setting: SettingsSchema) => (
    <div key={setting.key} className="setting-row">
      <label className="setting-label">
        {setting.label?.toLowerCase?.() || ''}
        {setting.description && (
          <button
            type="button"
            className={`setting-help${help?.key === setting.key ? ' is-open' : ''}`}
            aria-label={`about ${setting.label ?? setting.key}`}
            aria-expanded={help?.key === setting.key}
            onClick={event =>
              openHelp(setting.key, setting.description!, event.currentTarget)
            }
          >
            ?
          </button>
        )}
      </label>
      {renderSettingInput(setting)}
    </div>
  );

  const description = currentBackgroundDescription?.toLowerCase?.() || '';

  return (
    <div
      ref={panelRef}
      className={[
        'settings-sidebar',
        isMobile && 'settings-sheet',
        isClosing && 'closing',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="sidebar-header">
        <div className="background-header">
          <div className="background-controls-header">
            <div className="background-name">
              {currentBackgroundName?.toLowerCase?.() || ''}
            </div>
            {isMobile && description && (
              <button
                className={`description-toggle ${descriptionOpen ? 'open' : ''}`}
                onClick={() => setDescriptionOpen(open => !open)}
                aria-expanded={descriptionOpen}
                aria-label={
                  descriptionOpen
                    ? 'Hide background description'
                    : 'Show background description'
                }
              >
                i
              </button>
            )}
            {/* The same close as the chat panel's: the same box, the same
                glyph. */}
            <button
              type="button"
              onClick={onClose}
              className="close-button"
              aria-label="Close settings"
            >
              <CloseIcon />
            </button>
          </div>
          {/* Always in the tree rather than mounted on demand: on a phone this
              is a disclosure, and a thing that is not there cannot be eased
              open. Shut, it is zero-height and out of the accessibility tree
              (see .background-info in animated-backgrounds.scss). */}
          <div
            className={`background-info${!isMobile || descriptionOpen ? ' is-open' : ''}`}
            aria-hidden={isMobile && !descriptionOpen}
          >
            <div className="background-description">{description}</div>

            {currentBackgroundBlogPostSection && (
              <div className="blog-post-link-container">
                <a
                  href={`/timeline/250928_interactive-algorithm-visualizations/${currentBackgroundBlogPostSection}`}
                  className="blog-post-link"
                  onClick={e => {
                    e.preventDefault();
                    // Navigate using Gatsby's navigate to maintain state persistence
                    navigate(
                      `/timeline/250928_interactive-algorithm-visualizations/${currentBackgroundBlogPostSection}`
                    );
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  view in post
                </a>
              </div>
            )}
          </div>

          {currentBackgroundId === 'spectrogram-oscilloscope' && (
            <div className="special-hotkeys">
              <div className="special-hotkeys-title">special controls</div>
              <div className="special-hotkey-item">
                <button
                  className={`play-sound-button ${isAudioPlaying ? 'active' : ''}`}
                  onMouseDown={e => {
                    e.preventDefault();
                    onStartAudio?.();
                  }}
                  onMouseUp={e => {
                    e.preventDefault();
                    onStopAudio?.();
                  }}
                  onMouseLeave={e => {
                    e.preventDefault();
                    onStopAudio?.();
                  }}
                  onTouchStart={e => {
                    e.preventDefault();
                    onStartAudio?.();
                  }}
                  onTouchEnd={e => {
                    e.preventDefault();
                    onStopAudio?.();
                  }}
                  onTouchCancel={e => {
                    e.preventDefault();
                    onStopAudio?.();
                  }}
                  aria-label="Hold to play sound"
                  title="click and hold to play sound"
                >
                  <kbd>P</kbd> play sound
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isMobile ? (
        <>
          {/* One flat, swipeable strip of categories in place of the desktop's
              two collapsible sections of collapsible categories. */}
          <div
            className="category-tabs"
            role="tablist"
            aria-label="Setting categories"
          >
            {orderedCategories.map(category => (
              <button
                key={category}
                role="tab"
                aria-selected={activeCategory === category}
                className={[
                  'category-tab',
                  activeCategory === category && 'active',
                  STANDARD_CATEGORIES.has(category) && 'standard',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setActiveCategory(category)}
              >
                {category?.toLowerCase?.() || ''}
              </button>
            ))}
          </div>

          <div className="settings-content" role="tabpanel">
            {(activeCategory ? settingsByCategory[activeCategory] : [])?.map(
              renderSettingRow
            )}
          </div>
        </>
      ) : (
        <div className="settings-content settings-sections">
          {/* Custom categories (top, fixed) */}
          <div className="settings-section settings-section-custom">
            <div className="section-header">
              <div className="section-left">
                <button
                  className="section-action"
                  onClick={toggleCustomSection}
                  aria-label={
                    customAnyOpen ? 'Collapse all custom' : 'Expand all custom'
                  }
                  title={customAnyOpen ? 'collapse all' : 'expand all'}
                >
                  {customAnyOpen ? '▾' : '▸'}
                </button>
                <div className="section-title">custom settings</div>
              </div>
            </div>
            {customCategories.map(category => (
              <div key={category} className="settings-category">
                <button
                  className={`category-header ${openCategories[category] ? 'open' : ''}`}
                  onClick={() => toggleCategory(category)}
                  aria-expanded={!!openCategories[category]}
                >
                  <span className="category-left">
                    <span className="category-toggle" aria-hidden="true" />
                    <span className="category-title">
                      {category?.toLowerCase?.() || ''}
                    </span>
                  </span>
                </button>
                {openCategories[category] && (
                  <div className="category-content">
                    {(settingsByCategory[category] || []).map(renderSettingRow)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Standard categories (bottom-justified) */}
          <div className="settings-section settings-section-standard">
            <div className="section-header">
              <div className="section-left">
                <button
                  className="section-action"
                  onClick={toggleStandardSection}
                  aria-label={
                    standardAnyOpen
                      ? 'Collapse all standard'
                      : 'Expand all standard'
                  }
                  title={standardAnyOpen ? 'collapse all' : 'expand all'}
                >
                  {standardAnyOpen ? '▾' : '▸'}
                </button>
                <div className="section-title">standard settings</div>
              </div>
            </div>
            {standardCategories.map(category => (
              <div key={category} className="settings-category">
                <button
                  className={`category-header ${openCategories[category] ? 'open' : ''}`}
                  onClick={() => toggleCategory(category)}
                  aria-expanded={!!openCategories[category]}
                >
                  <span className="category-left">
                    <span className="category-toggle" aria-hidden="true" />
                    <span className="category-title">
                      {category?.toLowerCase?.() || ''}
                    </span>
                  </span>
                </button>
                {openCategories[category] && (
                  <div className="category-content">
                    {(settingsByCategory[category] || []).map(renderSettingRow)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="settings-panel-footer">
        {/* The one action. The shortcuts that used to be printed under it
            live behind `?` with the rest. */}
        <button
          type="button"
          onClick={onResetSettings}
          className="reset-button"
          disabled={!onResetSettings}
        >
          reset to defaults
        </button>
      </div>

      {/* The note a `?` opens: one box for the whole panel, placed over
          whichever mark asked for it. It is here, outside the scrolling list,
          because inside it the list's own overflow clipped it — which on a
          phone, where the list can be two rows tall, meant it was never
          visible at all. */}
      {help && (
        <div
          className={`setting-note${help.below ? ' is-below' : ''}`}
          role="tooltip"
          style={
            help.below
              ? { top: help.offset, maxHeight: help.room }
              : { bottom: help.offset, maxHeight: help.room }
          }
        >
          {help.text}
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;
