const SERIES_LIGHT = ['#2563eb', '#16a34a', '#ea580c', '#9333ea', '#0891b2', '#ca8a04', '#db2777', '#4f46e5'];
const SERIES_DARK = ['#60a5fa', '#4ade80', '#fb923c', '#c084fc', '#22d3ee', '#facc15', '#f472b6', '#818cf8'];

export interface PlotThemeColors {
  axis: string;
  grid: string;
  cursor: string;
  background: string;
  series: string[];
  seriesCss: string[];
}

/** uPlot canvas strokes must be plain rgb/hex strings — not oklch/css vars. */
export function readPlotThemeColors(seriesCount: number, isDark: boolean): PlotThemeColors {
  const palette = isDark ? SERIES_DARK : SERIES_LIGHT;
  const series = Array.from({ length: seriesCount }, (_, index) => palette[index % palette.length]!);

  return {
    axis: isDark ? '#d1d5db' : '#374151',
    grid: isDark ? '#4b5563' : '#d1d5db',
    cursor: isDark ? '#60a5fa' : '#2563eb',
    background: isDark ? '#111827' : '#ffffff',
    series,
    seriesCss: series,
  };
}
