import React from 'react';
import activity from '../../data/activity.json';

// The heatmap's ramp, darkest to brightest, ending on the site's own green.
// The four data steps are validated ordinal-ramp values against the site's
// surface — monotone lightness, visible gaps, low end above 2:1 — so the
// scale is measured, not eyeballed.
//
// Every step is opaque, including "no contributions". The card is
// transparent like every other card on the site, so a translucent square
// would take the hue of whatever the animation is doing behind it: over a
// bright field an empty day would out-lighten a busy one and the scale would
// read backwards. Level 0 is the darkest thing in the panel by construction,
// lifted just off the window so an empty year still reads as a grid.
const LEVEL_FILLS = ['#111a16', '#0e5233', '#0a7a47', '#05b866', '#00ff88'];

// GitHub's own grid geometry: 11px cells on a 14px step, weeks as columns.
const CELL = 11;
const STEP = 14;
const GUTTER_LEFT = 30; // room for the weekday labels
const GUTTER_TOP = 16; // room for the month labels

const MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

interface DayCell {
  date: string;
  count: number;
  level: number;
}

interface TooltipState {
  text: string;
  x: number;
  y: number;
  below: boolean;
}

// Parsed by hand rather than through `new Date(iso)`, which would shift the
// day across midnight in any timezone west of UTC.
const formatDay = (iso: string): string => {
  const [year, month, day] = iso.split('-').map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
};

// Stat-tile values: exact with commas while they fit, compact once they don't.
const formatValue = (n: number): string => {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return n.toLocaleString('en-US');
};

// A month label sits where its month begins. The first label goes if the next
// one crowds it (a partial opening month), and nothing labels the last couple
// of columns, where text would run off the right edge.
const monthLabels = (weeks: DayCell[][]): { week: number; label: string }[] => {
  const labels: { week: number; label: string }[] = [];
  let previous = -1;
  weeks.forEach((week, i) => {
    const month = Number(week[0]?.date.split('-')[1]) - 1;
    if (month !== previous) {
      labels.push({ week: i, label: MONTHS[month] });
      previous = month;
    }
  });
  if (labels.length >= 2 && labels[1].week - labels[0].week < 3) labels.shift();
  return labels.filter(l => l.week <= weeks.length - 3);
};

const ActivityPanel: React.FC = () => {
  const { calendar, metrics, generatedAt } = activity;
  const weeks = calendar.weeks as DayCell[][];
  const [tooltip, setTooltip] = React.useState<TooltipState | null>(null);
  const graphRef = React.useRef<HTMLDivElement>(null);

  const width = GUTTER_LEFT + weeks.length * STEP - (STEP - CELL);
  const height = GUTTER_TOP + 7 * STEP - (STEP - CELL);

  // Where the graph overflows (phones), it opens on this week, not on a year
  // ago — the reader scrolls back for history rather than forward for now.
  React.useEffect(() => {
    const container = graphRef.current;
    if (container) container.scrollLeft = container.scrollWidth;
  }, []);

  const showTooltip = (
    event: React.MouseEvent<SVGRectElement>,
    day: DayCell
  ) => {
    const container = graphRef.current;
    if (!container) return;
    const cell = event.currentTarget.getBoundingClientRect();
    const box = container.getBoundingClientRect();
    // Coordinates are content-relative (the tooltip lives inside the
    // scrollable inner div), so the scroll offset is part of the x.
    const rawX = cell.left - box.left + container.scrollLeft + cell.width / 2;
    // Clamped into the visible slice of the graph so the scroll container
    // never crops the label, and flipped under the cell on the top rows,
    // where there is no headroom above.
    // Half the widest tooltip ("NN contributions · mmm dd, yyyy"), so the
    // clamp really does keep the whole label inside the clipping box.
    const margin = 120;
    const x = Math.min(
      Math.max(rawX, container.scrollLeft + margin),
      container.scrollLeft + container.clientWidth - margin
    );
    const below = cell.top - box.top < 34;
    const plural = day.count === 1 ? 'contribution' : 'contributions';
    setTooltip({
      text: `${day.count} ${plural} · ${formatDay(day.date)}`,
      x,
      y: below ? cell.bottom - box.top : cell.top - box.top,
      below,
    });
  };

  const tiles = [
    { label: 'commits', value: metrics.commits },
    { label: 'prs merged', value: metrics.mergedPRs },
    {
      label: 'lines changed',
      value: metrics.linesAdded + metrics.linesDeleted,
    },
  ];

  return (
    <section className="activity-panel" aria-label="github activity">
      <div className="activity-header">
        <h2 className="activity-title">activity</h2>
        <span className="activity-total">
          {calendar.total.toLocaleString('en-US')} contributions in the last
          year
        </span>
      </div>

      <div className="activity-graph" ref={graphRef}>
        <div className="activity-graph-inner">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`contribution calendar: ${calendar.total.toLocaleString(
              'en-US'
            )} contributions in the last year`}
            onMouseLeave={() => setTooltip(null)}
          >
            {monthLabels(weeks).map(({ week, label }) => (
              <text
                key={`${label}-${week}`}
                className="activity-axis-label"
                x={GUTTER_LEFT + week * STEP}
                y={10}
              >
                {label}
              </text>
            ))}
            {[1, 3, 5].map(row => (
              <text
                key={row}
                className="activity-axis-label"
                x={GUTTER_LEFT - 6}
                y={GUTTER_TOP + row * STEP + CELL - 2}
                textAnchor="end"
              >
                {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][row]}
              </text>
            ))}
            {weeks.map((week, weekIndex) =>
              week.map(day => {
                const row = new Date(`${day.date}T00:00:00Z`).getUTCDay();
                return (
                  <rect
                    key={day.date}
                    className="activity-cell"
                    x={GUTTER_LEFT + weekIndex * STEP}
                    y={GUTTER_TOP + row * STEP}
                    width={CELL}
                    height={CELL}
                    rx={2}
                    fill={LEVEL_FILLS[day.level] ?? LEVEL_FILLS[0]}
                    aria-hidden="true"
                    onMouseEnter={event => showTooltip(event, day)}
                  />
                );
              })
            )}
          </svg>
          {tooltip && (
            <div
              className={`activity-tooltip${
                tooltip.below ? ' activity-tooltip--below' : ''
              }`}
              style={{ left: tooltip.x, top: tooltip.y }}
              role="status"
            >
              {tooltip.text}
            </div>
          )}
        </div>
      </div>

      <div className="activity-metrics">
        {tiles.map(tile => (
          <div
            key={tile.label}
            className="activity-metric"
            title={`${tile.value.toLocaleString('en-US')} ${tile.label}`}
          >
            <span className="activity-metric-value">
              {formatValue(tile.value)}
            </span>
            <span className="activity-metric-label">{tile.label}</span>
          </div>
        ))}
      </div>

      <div className="activity-foot">
        <span className="activity-updated">
          as of {formatDay(generatedAt.slice(0, 10))}
        </span>
        <div className="activity-legend" aria-hidden="true">
          <span>less</span>
          {LEVEL_FILLS.map(fill => (
            <span
              key={fill}
              className="activity-legend-swatch"
              style={{ backgroundColor: fill }}
            />
          ))}
          <span>more</span>
        </div>
      </div>
    </section>
  );
};

export default ActivityPanel;
