/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Interactive Stress Scenario & Macro Shock Loss Profile Chart
 *
 * Implements deterministic macroeconomic stress inspection:
 * - 5 historical / macro scenarios from Phase 7 stress suite
 * - Interactive crosshair and bar inspection
 * - Visualizes portfolio percentage drawdown & dollar capital loss
 * - Clean terminal visual hierarchy with exact numerical readouts
 */

import React, { useState } from 'react';
import { formatPercent, formatCurrency } from '../../utils/formatters';
import { Flame, AlertTriangle, Info } from 'lucide-react';

export interface StressScenarioItem {
  id?: string;
  name: string;
  lossPct: number; // e.g. -0.248 (-24.8%)
  lossDollar: number; // e.g. -24800
  description?: string;
}

export interface StressScenarioInteractiveChartProps {
  scenarios: StressScenarioItem[];
  title?: string;
  onSelectScenario?: (scenario: StressScenarioItem) => void;
}

export const StressScenarioInteractiveChart: React.FC<StressScenarioInteractiveChartProps> = ({
  scenarios,
  title = 'Deterministic Macroeconomic Shock Profile',
  onSelectScenario,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxAbsLoss = Math.max(...scenarios.map((s) => Math.abs(s.lossPct)), 0.05);

  return (
    <div className="bg-white border border-stone-200 rounded-xs overflow-hidden select-none font-mono">
      {/* Header */}
      <div className="border-b border-stone-200 bg-stone-50/70 p-3 sm:px-4 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Flame className="w-3.5 h-3.5 text-rose-700" />
          <span className="font-bold text-stone-900 font-sans">{title}</span>
        </div>
        <span className="text-[11px] text-stone-500 font-mono">
          Worst Shock: {formatPercent(-maxAbsLoss)}
        </span>
      </div>

      {/* Scenario Bar List with Interactive Crosshair Hover */}
      <div className="p-4 space-y-3.5">
        {scenarios.map((sc, i) => {
          const isHovered = hoveredIdx === i;
          const pctWidth = (Math.abs(sc.lossPct) / maxAbsLoss) * 100;

          return (
            <div
              key={i}
              onMouseEnter={() => {
                setHoveredIdx(i);
                if (onSelectScenario) onSelectScenario(sc);
              }}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => onSelectScenario && onSelectScenario(sc)}
              className={`p-2.5 rounded-xs transition-all cursor-pointer border ${
                isHovered
                  ? 'bg-stone-50/90 border-stone-400 shadow-2xs'
                  : 'bg-white border-transparent hover:border-stone-200'
              }`}
            >
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-sans font-medium text-stone-900 truncate max-w-[320px]">
                  {sc.name}
                </span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-rose-700">
                    {formatPercent(sc.lossPct, 2)}
                  </span>
                  <span className="text-stone-500 text-[11px]">
                    ({formatCurrency(sc.lossDollar, 0)})
                  </span>
                </div>
              </div>

              {/* Progress Bar with Zero Baseline */}
              <div className="h-2.5 w-full bg-stone-100 rounded-xs overflow-hidden border border-stone-200 flex">
                <div
                  style={{ width: `${pctWidth}%` }}
                  className={`h-full transition-all rounded-xs ${
                    isHovered ? 'bg-rose-700' : 'bg-rose-600/85'
                  }`}
                />
              </div>

              {sc.description && isHovered && (
                <div className="mt-2 pt-1.5 border-t border-stone-200 text-[11px] text-stone-600 font-sans leading-relaxed flex items-start gap-1.5 animate-fade-in">
                  <Info className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                  <span>{sc.description}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer reference guide */}
      <div className="border-t border-stone-100 bg-stone-50/50 px-4 py-2 flex items-center justify-between text-[10px] text-stone-500 font-sans">
        <span>Factor-implied instantaneous loss based on portfolio covariance &amp; beta</span>
        <span className="font-mono">Capital Base: $100k Initial</span>
      </div>
    </div>
  );
};
