/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Financial Chart Mathematical & Formatting Utilities
 *
 * Implements deterministic quantitative transformations:
 * - Date parsing and adaptive time axis labels
 * - Normalized cumulative percentage returns: (P_t - P_0) / P_0
 * - Rolling peak drawdowns: (P_t - Peak_t) / Peak_t <= 0
 * - Period-over-period (MoM) discrete percentage deltas
 * - Time range availability rules based on actual coverage
 * - Nice axis tick calculations
 */

export type TimeRangeOption = '1M' | '3M' | '6M' | 'YTD' | '1Y' | '3Y' | '5Y' | 'MAX';

export interface RangeStatus {
  available: boolean;
  reason?: string;
  count: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Parses a date string into a Date object or timestamp.
 * Supports "YYYY-MM", "YYYY-MM-DD", or Year numbers ("2023").
 */
export function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (/^\d{4}$/.test(dateStr)) {
    return new Date(parseInt(dateStr, 10), 0, 1);
  }
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    const [year, month] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, 1);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Formats a date string for display in axes or tooltips.
 */
export function formatDateDisplay(
  dateStr: string,
  style: 'axis' | 'tooltip' | 'compact' = 'axis'
): string {
  if (!dateStr) return '—';
  if (/^\d{4}$/.test(dateStr)) return dateStr;

  const d = parseDate(dateStr);
  const m = d.getMonth();
  const y = d.getFullYear();

  if (style === 'compact') {
    return `${MONTH_NAMES[m]} '${String(y).slice(-2)}`;
  }
  if (style === 'tooltip') {
    return `${MONTH_NAMES_FULL[m]} ${y}`;
  }
  // Default axis
  return `${MONTH_NAMES[m]} ${y}`;
}

/**
 * Calculates human-friendly axis ticks for financial values.
 */
export function calculateTicks(min: number, max: number, targetCount: number = 5): number[] {
  if (min === max) return [min];
  const span = max - min;
  if (span <= 0) return [min];

  const roughStep = span / (targetCount - 1);
  const power = Math.floor(Math.log10(roughStep));
  const fraction = roughStep / Math.pow(10, power);

  let niceFraction = 1;
  if (fraction > 1.5 && fraction <= 3) niceFraction = 2;
  else if (fraction > 3 && fraction <= 7) niceFraction = 5;
  else if (fraction > 7) niceFraction = 10;

  const step = niceFraction * Math.pow(10, power);
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  for (let val = start; val <= end + step * 0.0001; val += step) {
    ticks.push(Number(val.toFixed(4)));
  }

  return ticks.length >= 2 ? ticks : [min, (min + max) / 2, max];
}

/**
 * Computes period-over-period return: (P_t - P_{t-1}) / P_{t-1}.
 */
export function computePeriodReturns(prices: number[]): (number | null)[] {
  return prices.map((p, idx) => {
    if (idx === 0 || prices[idx - 1] === 0) return null;
    return (p - prices[idx - 1]) / prices[idx - 1];
  });
}

/**
 * Computes normalized cumulative return relative to a base index:
 * R_t = (P_t - P_base) / P_base.
 */
export function computeCumulativeReturns(prices: number[], baseIndex: number = 0): number[] {
  const base = prices[baseIndex] || prices[0] || 1;
  return prices.map((p) => (p - base) / base);
}

/**
 * Computes rolling peak drawdown:
 * D_t = (P_t - Peak_t) / Peak_t <= 0.
 */
export function computeDrawdowns(prices: number[]): { drawdown: number; peak: number }[] {
  let currentPeak = -Infinity;
  return prices.map((p) => {
    if (p > currentPeak) currentPeak = p;
    const dd = currentPeak > 0 ? (p - currentPeak) / currentPeak : 0;
    return { drawdown: dd, peak: currentPeak };
  });
}

/**
 * Determines which time ranges are valid based on actual historical data depth.
 */
export function evaluateTimeRanges<T extends { date: string }>(data: T[]): Record<TimeRangeOption, RangeStatus> {
  const total = data.length;
  if (total === 0) {
    const disabled: RangeStatus = { available: false, reason: 'No data available', count: 0 };
    return {
      '1M': disabled,
      '3M': disabled,
      '6M': disabled,
      'YTD': disabled,
      '1Y': disabled,
      '3Y': disabled,
      '5Y': disabled,
      MAX: disabled,
    };
  }

  // Calculate span in months
  const first = parseDate(data[0].date);
  const last = parseDate(data[data.length - 1].date);
  const monthsDiff = (last.getFullYear() - first.getFullYear()) * 12 + (last.getMonth() - first.getMonth()) + 1;

  return {
    '1M': {
      available: total >= 2,
      reason: total < 2 ? 'Requires at least 2 data points' : undefined,
      count: Math.min(2, total),
    },
    '3M': {
      available: total >= 3,
      reason: total < 3 ? 'Requires at least 3 monthly observations' : undefined,
      count: Math.min(3, total),
    },
    '6M': {
      available: monthsDiff >= 6 || total >= 6,
      reason: total < 6 ? `Coverage limited to ${total} observations (${monthsDiff} mos)` : undefined,
      count: Math.min(6, total),
    },
    'YTD': {
      available: (() => {
        const lastYear = last.getFullYear();
        const ytdPoints = data.filter((d) => parseDate(d.date).getFullYear() === lastYear);
        return ytdPoints.length >= 2;
      })(),
      reason: 'Requires multiple observations in current calendar year',
      count: data.filter((d) => parseDate(d.date).getFullYear() === last.getFullYear()).length,
    },
    '1Y': {
      available: monthsDiff >= 12 || total >= 12,
      reason: `Requires 12 months history (current dataset: ${total} points)`,
      count: Math.min(12, total),
    },
    '3Y': {
      available: monthsDiff >= 36 || total >= 36,
      reason: `Requires 36 months history (current dataset: ${total} points)`,
      count: Math.min(36, total),
    },
    '5Y': {
      available: monthsDiff >= 60 || total >= 60,
      reason: `Requires 60 months history (current dataset: ${total} points)`,
      count: Math.min(60, total),
    },
    MAX: {
      available: true,
      count: total,
    },
  };
}

/**
 * Slices the dataset based on the requested time range.
 */
export function sliceDataByRange<T extends { date: string }>(
  data: T[],
  range: TimeRangeOption
): { items: T[]; startIndex: number; endIndex: number } {
  if (!data || data.length === 0) {
    return { items: [], startIndex: 0, endIndex: 0 };
  }
  if (range === 'MAX' || data.length <= 2) {
    return { items: data, startIndex: 0, endIndex: data.length - 1 };
  }

  const lastDate = parseDate(data[data.length - 1].date);

  let targetStartIndex = 0;
  if (range === '1M') {
    targetStartIndex = Math.max(0, data.length - 2);
  } else if (range === '3M') {
    targetStartIndex = Math.max(0, data.length - 4);
  } else if (range === '6M') {
    targetStartIndex = Math.max(0, data.length - 7);
  } else if (range === 'YTD') {
    const currentYear = lastDate.getFullYear();
    const idx = data.findIndex((d) => parseDate(d.date).getFullYear() === currentYear);
    targetStartIndex = idx >= 0 ? idx : 0;
  } else if (range === '1Y') {
    targetStartIndex = Math.max(0, data.length - 12);
  } else if (range === '3Y') {
    targetStartIndex = Math.max(0, data.length - 36);
  } else if (range === '5Y') {
    targetStartIndex = Math.max(0, data.length - 60);
  }

  const items = data.slice(targetStartIndex);
  return {
    items,
    startIndex: targetStartIndex,
    endIndex: data.length - 1,
  };
}
