/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Interactive 10-Year Trajectory & Liability Reserve Compounding Chart
 *
 * Implements precision multi-year portfolio capital modeling:
 * - 2023 Initial Capital ($100,000) compounding at 21.85% gross return
 * - Beginning-2033 Ground Zero checkpoint ($721,532)
 * - Liability Reserve PV requirement ($43,899.80) locked for 10-year commitments
 * - Interactive crosshair and inspection of each annual milestone
 * - View modes: Cumulative Capital ($) vs. Annual Growth Delta ($)
 */

import React, { useState, useMemo } from 'react';
import { TrajectoryYearSchedule, LiabilityReserveSpec } from '../../types/quantTypes';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { calculateTicks } from './chartUtils';
import { useChartInteraction } from './useChartInteraction';
import { ShieldCheck, TrendingUp, BarChart2, CheckCircle2 } from 'lucide-react';

export interface TrajectoryInteractiveChartProps {
  schedule: TrajectoryYearSchedule[];
  reserveSpec: LiabilityReserveSpec;
  height?: number;
}

export const TrajectoryInteractiveChart: React.FC<TrajectoryInteractiveChartProps> = ({
  schedule,
  reserveSpec,
  height = 340,
}) => {
  const [viewMode, setViewMode] = useState<'compounding' | 'annualDelta'>('compounding');

  const chartWidth = 720;
  const padding = { top: 24, right: 76, bottom: 32, left: 18 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Chart interaction hook
  const {
    containerRef,
    activeIndex,
    isHovered,
    getXFromIndex,
    handlePointerMove,
    handlePointerDown,
    handlePointerUp,
    handlePointerLeave,
  } = useChartInteraction({
    pointCount: schedule.length,
    chartWidth,
    chartHeight: height,
    padding,
  });

  // Calculate annual capital deltas
  const annualDeltas = useMemo(() => {
    return schedule.map((s) => s.endingPortfolioValue - s.beginningCapital);
  }, [schedule]);

  // Determine Y-scale bounds
  const { yMin, yMax, yTicks } = useMemo(() => {
    if (viewMode === 'compounding') {
      const maxVal = Math.max(...schedule.map((s) => s.endingPortfolioValue)) * 1.06;
      const ticks = calculateTicks(0, maxVal, 5);
      return { yMin: 0, yMax: maxVal, yTicks: ticks };
    } else {
      const maxDelta = Math.max(...annualDeltas) * 1.15;
      const ticks = calculateTicks(0, maxDelta, 5);
      return { yMin: 0, yMax: maxDelta, yTicks: ticks };
    }
  }, [viewMode, schedule, annualDeltas]);

  const getYCoordinate = (val: number): number => {
    const fraction = (val - yMin) / (yMax - yMin || 1);
    return padding.top + plotHeight - fraction * plotHeight;
  };

  // Compounding points
  const points = useMemo(() => {
    return schedule.map((s, i) => {
      const x = getXFromIndex(i);
      const val = viewMode === 'compounding' ? s.beginningCapital : annualDeltas[i];
      const y = getYCoordinate(val);
      return { x, y, val, item: s };
    });
  }, [schedule, viewMode, annualDeltas, getXFromIndex, yMin, yMax]);

  const pathStr = useMemo(() => {
    if (points.length === 0) return '';
    return `M ${points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`;
  }, [points]);

  const areaStr = useMemo(() => {
    if (points.length === 0) return '';
    const firstX = points[0].x.toFixed(1);
    const lastX = points[points.length - 1].x.toFixed(1);
    const zeroY = (padding.top + plotHeight).toFixed(1);
    return `${pathStr} L ${lastX},${zeroY} L ${firstX},${zeroY} Z`;
  }, [pathStr, points, padding.top, plotHeight]);

  // Beginning-2033 Ground Zero Marker at Year 10
  const groundZeroPoint = points[points.length - 1];
  const reservePVY = getYCoordinate(reserveSpec.reservePVBeginning2033);

  // Inspected Milestone
  const inspectIndex = activeIndex !== null ? activeIndex : schedule.length - 1;
  const inspectedMilestone = schedule[inspectIndex];
  const inspectedDelta = annualDeltas[inspectIndex];

  return (
    <div className="bg-white border border-stone-200 rounded-xs overflow-hidden select-none font-mono">
      {/* Header bar */}
      <div className="border-b border-stone-200 bg-stone-50/70 p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <span className="font-bold text-stone-900 font-sans text-xs">
            10-Year Horizon Compounding Trajectory
          </span>
          <span className="text-stone-500 font-mono text-[11px]">
            Target Beg-2033: {formatCurrency(reserveSpec.beginning2033CapitalBaseline, 0)}
          </span>
        </div>

        {/* View mode toggle */}
        <div className="flex rounded-xs border border-stone-300 bg-white p-0.5 text-[11px] font-sans">
          <button
            onClick={() => setViewMode('compounding')}
            className={`px-2.5 py-1 rounded-xs transition-colors font-medium flex items-center gap-1 ${
              viewMode === 'compounding'
                ? 'bg-stone-900 text-stone-50 font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            <span>Cumulative Value ($)</span>
          </button>
          <button
            onClick={() => setViewMode('annualDelta')}
            className={`px-2.5 py-1 rounded-xs transition-colors font-medium flex items-center gap-1 ${
              viewMode === 'annualDelta'
                ? 'bg-stone-900 text-stone-50 font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BarChart2 className="w-3 h-3" />
            <span>Annual Growth ($)</span>
          </button>
        </div>
      </div>

      {/* Interactive SVG Surface */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        className="relative w-full overflow-hidden cursor-crosshair touch-none bg-white"
        style={{ height }}
      >
        <svg
          viewBox={`0 0 ${chartWidth} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full block"
        >
          <defs>
            <linearGradient id="trajCompGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines & Right Axis Labels */}
          {yTicks.map((tick, idx) => {
            const y = getYCoordinate(tick);
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <text
                  x={chartWidth - padding.right + 6}
                  y={y + 3.5}
                  fill="#64748b"
                  fontSize="9.5"
                  fontFamily="IBM Plex Mono, monospace"
                  textAnchor="start"
                >
                  ${(tick / 1000).toFixed(0)}k
                </text>
              </g>
            );
          })}

          {/* Liability Reserve PV Threshold Line at Year 10 (when in compounding view) */}
          {viewMode === 'compounding' && groundZeroPoint && (
            <g>
              <line
                x1={groundZeroPoint.x}
                y1={padding.top}
                x2={groundZeroPoint.x}
                y2={height - padding.bottom}
                stroke="#0d9488"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <line
                x1={padding.left}
                y1={reservePVY}
                x2={groundZeroPoint.x}
                y2={reservePVY}
                stroke="#0d9488"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={groundZeroPoint.x}
                cy={reservePVY}
                r="4"
                fill="#ffffff"
                stroke="#0d9488"
                strokeWidth="2"
              />
              <text
                x={groundZeroPoint.x - 8}
                y={reservePVY - 6}
                fill="#0f766e"
                fontSize="9.5"
                fontWeight="600"
                fontFamily="IBM Plex Mono, monospace"
                textAnchor="end"
              >
                Reserve PV: ${Math.round(reserveSpec.reservePVBeginning2033 / 1000)}k
              </text>
            </g>
          )}

          {/* Area and Line */}
          <path d={areaStr} fill="url(#trajCompGrad)" />
          <path
            d={pathStr}
            fill="none"
            stroke="#059669"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Year Markers & Ticks */}
          {points.map((p, i) => {
            const isInspect = i === inspectIndex;
            return (
              <g key={`pt-${i}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isInspect ? 4.5 : 2.5}
                  fill={isInspect ? '#059669' : '#ffffff'}
                  stroke="#059669"
                  strokeWidth={isInspect ? 2 : 1.5}
                />
                <line
                  x1={p.x}
                  y1={height - padding.bottom}
                  x2={p.x}
                  y2={height - padding.bottom + 4}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
                <text
                  x={p.x}
                  y={height - 12}
                  fill={isInspect ? '#0f172a' : '#64748b'}
                  fontWeight={isInspect ? '700' : '400'}
                  fontSize="9.5"
                  fontFamily="IBM Plex Mono, monospace"
                  textAnchor="middle"
                >
                  {p.item.calendarYear}
                </text>
              </g>
            );
          })}

          {/* Snapped Crosshair Guide */}
          {points[inspectIndex] && (
            <g className="pointer-events-none">
              <line
                x1={points[inspectIndex].x}
                y1={padding.top}
                x2={points[inspectIndex].x}
                y2={height - padding.bottom}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <line
                x1={padding.left}
                y1={points[inspectIndex].y}
                x2={chartWidth - padding.right}
                y2={points[inspectIndex].y}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {/* Right Axis Value Badge */}
              <rect
                x={chartWidth - padding.right}
                y={points[inspectIndex].y - 9}
                width={padding.right}
                height={18}
                fill="#0f172a"
                rx="1"
              />
              <text
                x={chartWidth - padding.right + 4}
                y={points[inspectIndex].y + 3.5}
                fill="#ffffff"
                fontSize="9.5"
                fontFamily="IBM Plex Mono, monospace"
                fontWeight="600"
                textAnchor="start"
              >
                ${(points[inspectIndex].val / 1000).toFixed(1)}k
              </text>
            </g>
          )}
        </svg>

        {/* Floating Tooltip */}
        {isHovered && inspectedMilestone && (
          <div
            className="absolute z-20 pointer-events-none transition-transform duration-75 ease-out"
            style={{
              left: `${(getXFromIndex(inspectIndex) / chartWidth) * 100}%`,
              transform:
                inspectIndex > points.length * 0.6
                  ? 'translateX(calc(-100% - 14px))'
                  : 'translateX(14px)',
              top: '16px',
            }}
          >
            <div className="bg-stone-900/95 text-stone-100 rounded-xs px-3 py-2.5 shadow-lg border border-stone-800 text-[11px] font-mono space-y-1.5 backdrop-blur-xs min-w-[210px]">
              <div className="flex justify-between items-center border-b border-stone-700/80 pb-1 text-[10px] text-stone-400">
                <span className="font-bold text-stone-200">
                  Year {inspectedMilestone.year} · Calendar {inspectedMilestone.calendarYear}
                </span>
                <span className="text-emerald-400 font-semibold">
                  +{formatPercent(inspectedMilestone.grossReturn, 2)} Gross
                </span>
              </div>

              <div className="space-y-0.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-stone-300">Beginning Capital:</span>
                  <span className="font-bold text-white">
                    {formatCurrency(inspectedMilestone.beginningCapital, 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-300">Ending Portfolio Value:</span>
                  <span className="font-bold text-emerald-400">
                    {formatCurrency(inspectedMilestone.endingPortfolioValue, 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-stone-400">
                  <span>Annual Growth Gain:</span>
                  <span className="text-stone-200">
                    +{formatCurrency(inspectedDelta, 0)}
                  </span>
                </div>
              </div>

              <div className="pt-1 border-t border-stone-800 text-[10px] text-stone-400 font-sans leading-tight">
                {inspectedMilestone.timingNote}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer provenance & summary strip */}
      <div className="border-t border-stone-200 bg-stone-50/60 p-2.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-stone-600 font-sans">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            Ground Zero Beg-2033 Capital: <strong className="font-mono text-stone-900">${Math.round(reserveSpec.beginning2033CapitalBaseline).toLocaleString()}</strong>
          </span>
          <span className="text-stone-400">·</span>
          <span>
            Reserve PV: <strong className="font-mono text-teal-800">${Math.round(reserveSpec.reservePVBeginning2033).toLocaleString()}</strong>
          </span>
        </div>
        <div className="font-mono text-emerald-800 font-semibold text-xs">
          Surplus Residual: ${Math.round(reserveSpec.residualCapitalBaseline).toLocaleString()}
        </div>
      </div>
    </div>
  );
};
