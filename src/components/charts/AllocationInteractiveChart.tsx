/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Institutional Allocation Distribution Chart
 *
 * Visualizes portfolio asset allocation:
 * - Proportional weight segments with interactive hover highlighting
 * - Exact percentage and capital allocation readouts
 * - Clean institutional typography and restrained palette
 */

import React, { useState } from 'react';
import { formatPercent, formatCurrency } from '../../utils/formatters';

export interface AllocationChartItem {
  label: string;
  weight: number; // 0.0 to 1.0 (e.g. 0.40)
  color: string;
  currentValue?: number;
  sector?: string;
}

export interface AllocationInteractiveChartProps {
  items: AllocationChartItem[];
  totalCapital?: number;
  title?: string;
  onSelectItem?: (item: AllocationChartItem) => void;
}

export const AllocationInteractiveChart: React.FC<AllocationInteractiveChartProps> = ({
  items,
  totalCapital = 100000,
  title,
  onSelectItem,
}) => {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  const totalWeight = items.reduce((acc, it) => acc + (it.weight || 0), 0);

  return (
    <div className="space-y-3 font-mono text-xs select-none">
      {title && (
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-stone-900 font-sans">{title}</span>
          <span className="text-stone-500 font-mono text-[11px]">
            Total: {(totalWeight * 100).toFixed(1)}% / 100.0%
          </span>
        </div>
      )}

      {/* Segmented Distribution Bar */}
      <div className="h-5 w-full flex rounded-xs overflow-hidden bg-stone-100 border border-stone-200">
        {items.map((it, idx) => {
          const isHovered = hoveredLabel === it.label;
          const pct = Math.max(0, it.weight * 100);
          if (pct <= 0) return null;

          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredLabel(it.label)}
              onMouseLeave={() => setHoveredLabel(null)}
              onClick={() => onSelectItem && onSelectItem(it)}
              style={{
                width: `${pct}%`,
                backgroundColor: it.color,
                opacity: hoveredLabel && !isHovered ? 0.45 : 1.0,
              }}
              title={`${it.label}: ${pct.toFixed(1)}%`}
              className="h-full transition-all cursor-pointer relative group"
            />
          );
        })}
      </div>

      {/* Analytical Legend Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
        {items.map((it, idx) => {
          const isHovered = hoveredLabel === it.label;
          const dollarAmount = it.currentValue ?? it.weight * totalCapital;

          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredLabel(it.label)}
              onMouseLeave={() => setHoveredLabel(null)}
              onClick={() => onSelectItem && onSelectItem(it)}
              className={`p-2 rounded-xs border transition-all cursor-pointer ${
                isHovered
                  ? 'bg-stone-50 border-stone-400 shadow-2xs'
                  : 'bg-white border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: it.color }}
                />
                <span className="font-bold text-stone-900 font-mono text-xs">{it.label}</span>
                {it.sector && (
                  <span className="text-[10px] text-stone-500 font-sans truncate">
                    ({it.sector})
                  </span>
                )}
              </div>
              <div className="flex justify-between items-baseline text-[11px]">
                <span className="font-bold text-stone-900 font-mono">
                  {formatPercent(it.weight, 1)}
                </span>
                <span className="text-stone-500 font-mono text-[10px]">
                  {formatCurrency(dollarAmount, 0)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
