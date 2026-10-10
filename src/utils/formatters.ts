/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Quantitative Research Terminal - Financial Formatters & Editorial Data State Styles
 */

import { DataState, FundamentalClassification } from '../types/quantTypes';

export function formatCurrency(
  val: number | null | undefined,
  decimals: number = 2
): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function formatPercent(
  val: number | null | undefined,
  decimals: number = 2,
  showPlus: boolean = false
): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const pct = val * 100;
  const formatted = pct.toFixed(decimals) + '%';
  return showPlus && pct > 0 ? `+${formatted}` : formatted;
}

export function formatRatio(
  val: number | null | undefined,
  decimals: number = 2
): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return val.toFixed(decimals) + 'x';
}

export function formatNumber(
  val: number | null | undefined,
  decimals: number = 2
): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function formatLargeNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const abs = Math.abs(val);
  if (abs >= 1e12) return (val / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return (val / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (val / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (val / 1e3).toFixed(1) + 'k';
  return val.toFixed(0);
}

export function formatDelta(
  val: number | null | undefined,
  isPercent: boolean = true,
  decimals: number = 2
): { text: string; colorClass: string; isPositive: boolean; isNeutral: boolean } {
  if (val === null || val === undefined || isNaN(val)) {
    return { text: '—', colorClass: 'text-stone-400', isPositive: false, isNeutral: true };
  }
  const isNeutral = Math.abs(val) < 0.0001;
  const isPositive = val > 0;
  let text = isPercent
    ? (val * 100).toFixed(decimals) + '%'
    : val.toFixed(decimals);

  if (isPositive) text = `+${text}`;

  let colorClass = 'text-stone-700';
  if (isPositive) colorClass = 'text-emerald-700 font-medium';
  else if (val < 0) colorClass = 'text-rose-700 font-medium';

  return { text, colorClass, isPositive, isNeutral };
}

export interface StateBadgeStyle {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
  description: string;
}

export function getDataStateBadgeStyle(state: DataState): StateBadgeStyle {
  switch (state) {
    case 'READY':
      return {
        label: 'READY',
        bgClass: 'bg-emerald-50/80',
        textClass: 'text-emerald-900 font-medium',
        borderClass: 'border-emerald-200',
        dotClass: 'bg-emerald-600',
        description: 'All fundamental & price points verified, normalized, and model-ready.',
      };
    case 'PARTIAL':
      return {
        label: 'PARTIAL',
        bgClass: 'bg-amber-50/80',
        textClass: 'text-amber-900 font-medium',
        borderClass: 'border-amber-200',
        dotClass: 'bg-amber-600',
        description: 'Primary data available; secondary ratio or provider verification pending.',
      };
    case 'UNRESOLVED':
      return {
        label: 'UNRESOLVED',
        bgClass: 'bg-purple-50/80',
        textClass: 'text-purple-900 font-medium',
        borderClass: 'border-purple-200',
        dotClass: 'bg-purple-600',
        description: 'Provider values conflict without an authoritative resolution rule configured.',
      };
    case 'UNVERIFIED':
      return {
        label: 'UNVERIFIED',
        bgClass: 'bg-rose-50/80',
        textClass: 'text-rose-900 font-medium',
        borderClass: 'border-rose-200',
        dotClass: 'bg-rose-600',
        description: 'Security is a research candidate but NOT approved in the Wharton WInS simulator.',
      };
    case 'VERIFIED':
      return {
        label: 'VERIFIED',
        bgClass: 'bg-teal-50/80',
        textClass: 'text-teal-900 font-medium',
        borderClass: 'border-teal-200',
        dotClass: 'bg-teal-600',
        description: 'Confirmed approved on WInS trading simulator platform.',
      };
    case 'MISSING':
      return {
        label: 'MISSING',
        bgClass: 'bg-rose-50/80',
        textClass: 'text-rose-900 font-medium',
        borderClass: 'border-rose-200',
        dotClass: 'bg-rose-600',
        description: 'Required data point is completely absent across all providers.',
      };
    case 'INVALID':
      return {
        label: 'INVALID',
        bgClass: 'bg-rose-100',
        textClass: 'text-rose-950 font-medium',
        borderClass: 'border-rose-300',
        dotClass: 'bg-rose-700',
        description: 'Value failed quantitative sanity or schema validation checks.',
      };
    case 'BLOCKED':
      return {
        label: 'BLOCKED',
        bgClass: 'bg-stone-100',
        textClass: 'text-stone-800 font-medium',
        borderClass: 'border-stone-300',
        dotClass: 'bg-stone-500',
        description: 'Excluded by hard mandate constraints or regulatory compliance filter.',
      };
    case 'UNAVAILABLE':
      return {
        label: 'UNAVAILABLE',
        bgClass: 'bg-stone-100',
        textClass: 'text-stone-700',
        borderClass: 'border-stone-300',
        dotClass: 'bg-stone-500',
        description: 'Provider API endpoint returned null or HTTP error code.',
      };
    case 'NOT_PROVIDED':
      return {
        label: 'NOT PROVIDED',
        bgClass: 'bg-stone-100',
        textClass: 'text-stone-600',
        borderClass: 'border-stone-200',
        dotClass: 'bg-stone-400',
        description: 'Provider does not compute or publish this field.',
      };
    case 'NOT_COMPUTED':
      return {
        label: 'NOT COMPUTED',
        bgClass: 'bg-stone-100',
        textClass: 'text-stone-600',
        borderClass: 'border-stone-200',
        dotClass: 'bg-stone-400',
        description: 'Dependent metric pending underlying inputs calculation.',
      };
    case 'NOT_STRESSED':
    default:
      return {
        label: 'NOT STRESSED',
        bgClass: 'bg-stone-100',
        textClass: 'text-stone-600',
        borderClass: 'border-stone-200',
        dotClass: 'bg-stone-400',
        description: 'Scenario test not yet executed on this security.',
      };
  }
}

export function getFundamentalClassBadge(type: FundamentalClassification): {
  label: string;
  badgeClass: string;
  desc: string;
} {
  switch (type) {
    case 'DIRECT':
      return {
        label: 'DIRECT (SEC)',
        badgeClass: 'text-teal-900 bg-teal-50/90 border-teal-200 font-medium',
        desc: 'Direct GAAP entry from SEC EDGAR 10-K / 10-Q filing ground truth.',
      };
    case 'DERIVED':
      return {
        label: 'DERIVED',
        badgeClass: 'text-stone-800 bg-stone-100/90 border-stone-200',
        desc: 'Calculated ratio from vendor multi-step formula.',
      };
    case 'UNRESOLVED':
      return {
        label: 'DISCREPANCY',
        badgeClass: 'text-amber-900 bg-amber-50/90 border-amber-200 font-medium',
        desc: 'Multiple providers disagree on this fundamental figure.',
      };
    case 'NOT_PROVIDED':
    default:
      return {
        label: 'NOT PROVIDED',
        badgeClass: 'text-stone-600 bg-stone-100 border-stone-200',
        desc: 'Explicitly omitted by vendor payload.',
      };
  }
}
