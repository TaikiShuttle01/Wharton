/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Institutional Financial Time-Series Chart Component
 *
 * Implements Bloomberg / TradingView terminal-grade visualization:
 * - Multi-mode analytics: Nominal Price ($), Normalized Return (% vs SPY), Drawdown (%)
 * - Precision synchronized crosshair (vertical time guide + horizontal price marker)
 * - Exact floating financial data inspector tooltip (clamped against boundary clipping)
 * - Coverage-aware time-range controls (1M, 3M, 6M, YTD, 1Y, 3Y, 5Y, MAX)
 * - Draggable time-range navigator / overview slider
 * - Volume histogram sub-panel
 * - Clean institutional typography (Inter text, IBM Plex Mono for figures)
 * - Discontinuity & missing-data integrity
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MonthlyPricePoint } from '../../types/quantTypes';
import {
  formatCurrency,
  formatPercent,
  formatLargeNumber,
  formatDelta,
} from '../../utils/formatters';
import {
  TimeRangeOption,
  evaluateTimeRanges,
  sliceDataByRange,
  formatDateDisplay,
  calculateTicks,
  computePeriodReturns,
  computeCumulativeReturns,
  computeDrawdowns,
} from './chartUtils';
import { useChartInteraction } from './useChartInteraction';
import { Sliders, Maximize2, AlertCircle, BarChart3, TrendingUp, TrendingDown, Layers } from 'lucide-react';

export type ChartDisplayMode = 'price' | 'return' | 'drawdown';

export interface FinancialTimeSeriesChartProps {
  data: MonthlyPricePoint[];
  title?: string;
  symbol?: string;
  benchmarkData?: MonthlyPricePoint[];
  benchmarkSymbol?: string;
  primaryColor?: string;
  height?: number;
  showNavigator?: boolean;
  emptyMessage?: string;
}

export const FinancialTimeSeriesChart: React.FC<FinancialTimeSeriesChartProps> = ({
  data,
  title,
  symbol = 'SECURITY',
  benchmarkData,
  benchmarkSymbol = 'SPY',
  primaryColor = '#1e293b',
  height = 480,
  showNavigator = true,
  emptyMessage = 'No historical time-series observations available for this instrument.',
}) => {
  // Chart Modes & Filter State
  const [displayMode, setDisplayMode] = useState<ChartDisplayMode>('price');
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('MAX');
  const [includeBenchmark, setIncludeBenchmark] = useState<boolean>(true);
  const [showVolume, setShowVolume] = useState<boolean>(true);

  // Range navigator window (0 to data.length - 1)
  const [navRange, setNavRange] = useState<{ start: number; end: number }>({
    start: 0,
    end: Math.max(0, data.length - 1),
  });

  // Evaluate range availability
  const rangeAvailability = useMemo(() => evaluateTimeRanges(data), [data]);

  // Synchronize navRange when data or timeRange changes
  useEffect(() => {
    if (!data || data.length === 0) return;
    const { startIndex, endIndex } = sliceDataByRange(data, timeRange);
    setNavRange({ start: startIndex, end: endIndex });
  }, [data, timeRange]);

  // Sliced active dataset based on navRange
  const activeData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const s = Math.max(0, Math.min(navRange.start, data.length - 1));
    const e = Math.max(s, Math.min(navRange.end, data.length - 1));
    return data.slice(s, e + 1);
  }, [data, navRange]);

  // Aligned benchmark points for activeData
  const activeBenchmark = useMemo(() => {
    if (!benchmarkData || benchmarkData.length === 0) return [];
    return activeData.map((d) => {
      const match = benchmarkData.find((b) => b.date === d.date);
      return match || null;
    });
  }, [activeData, benchmarkData]);

  // Mathematical transformations on active slice
  const primaryCloses = useMemo(() => activeData.map((d) => d.close), [activeData]);
  const primaryPeriodReturns = useMemo(() => computePeriodReturns(primaryCloses), [primaryCloses]);
  const primaryCumReturns = useMemo(() => computeCumulativeReturns(primaryCloses, 0), [primaryCloses]);
  const primaryDrawdowns = useMemo(() => computeDrawdowns(primaryCloses), [primaryCloses]);

  const benchmarkCloses = useMemo(() => {
    return activeBenchmark.map((b) => (b ? b.close : null));
  }, [activeBenchmark]);

  const benchmarkCumReturns = useMemo(() => {
    const validFirst = benchmarkCloses.find((c) => c !== null);
    if (!validFirst) return activeBenchmark.map(() => null);
    return benchmarkCloses.map((c) => (c !== null ? (c - validFirst) / validFirst : null));
  }, [benchmarkCloses, activeBenchmark]);

  // SVG Geometry Dimensions with improved vertical space and breathing room
  const chartWidth = 720;
  const padding = { top: 26, right: 68, bottom: showVolume ? 52 : 32, left: 18 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const volumeHeight = showVolume ? 32 : 0;
  const pricePlotHeight = plotHeight - volumeHeight - (showVolume ? 8 : 0);

  // Interaction Hook
  const {
    containerRef,
    activeIndex,
    setActiveIndex,
    isHovered,
    isDragging,
    getXFromIndex,
    handlePointerMove,
    handlePointerDown,
    handlePointerUp,
    handlePointerLeave,
  } = useChartInteraction({
    pointCount: activeData.length,
    chartWidth,
    chartHeight: height,
    padding,
  });

  // Calculate Y-scale bounds based on displayMode
  const { yMin, yMax, yTicks } = useMemo(() => {
    if (activeData.length === 0) return { yMin: 0, yMax: 100, yTicks: [0, 50, 100] };

    if (displayMode === 'price') {
      const min = Math.min(...primaryCloses);
      const max = Math.max(...primaryCloses);
      const pad = (max - min) * 0.08 || min * 0.05 || 1;
      const ticks = calculateTicks(min - pad, max + pad, 5);
      return { yMin: min - pad, yMax: max + pad, yTicks: ticks };
    }

    if (displayMode === 'return') {
      const allReturns = [...primaryCumReturns];
      if (includeBenchmark) {
        benchmarkCumReturns.forEach((r) => {
          if (r !== null) allReturns.push(r);
        });
      }
      const min = Math.min(0, ...allReturns);
      const max = Math.max(0, ...allReturns);
      const pad = (max - min) * 0.1 || 0.02;
      const ticks = calculateTicks(min - pad, max + pad, 5);
      return { yMin: min - pad, yMax: max + pad, yTicks: ticks };
    }

    if (displayMode === 'drawdown') {
      const dds = primaryDrawdowns.map((d) => d.drawdown);
      const min = Math.min(0, ...dds);
      const max = 0;
      const pad = Math.abs(min) * 0.1 || 0.02;
      const ticks = calculateTicks(min - pad, 0, 5);
      return { yMin: min - pad, yMax: 0, yTicks: ticks };
    }

    return { yMin: 0, yMax: 100, yTicks: [0, 50, 100] };
  }, [activeData, displayMode, primaryCloses, primaryCumReturns, primaryDrawdowns, includeBenchmark, benchmarkCumReturns]);

  // Volume scale
  const maxVolume = useMemo(() => {
    if (!showVolume || activeData.length === 0) return 1;
    return Math.max(...activeData.map((d) => d.volume || 0), 1);
  }, [activeData, showVolume]);

  // Function to map a value to pixel Y
  const getYCoordinate = (val: number | null): number => {
    if (val === null || isNaN(val)) return padding.top + pricePlotHeight / 2;
    const fraction = (val - yMin) / (yMax - yMin || 1);
    return padding.top + pricePlotHeight - fraction * pricePlotHeight;
  };

  // Build SVG path points for primary series
  const primaryPoints = useMemo(() => {
    return activeData.map((d, i) => {
      const x = getXFromIndex(i);
      let val = d.close;
      if (displayMode === 'return') val = primaryCumReturns[i];
      if (displayMode === 'drawdown') val = primaryDrawdowns[i].drawdown;
      const y = getYCoordinate(val);
      return { x, y, val };
    });
  }, [activeData, displayMode, primaryCumReturns, primaryDrawdowns, getXFromIndex, yMin, yMax]);

  const primaryPathStr = useMemo(() => {
    if (primaryPoints.length === 0) return '';
    return `M ${primaryPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`;
  }, [primaryPoints]);

  const primaryAreaStr = useMemo(() => {
    if (primaryPoints.length === 0) return '';
    const firstX = primaryPoints[0].x.toFixed(1);
    const lastX = primaryPoints[primaryPoints.length - 1].x.toFixed(1);
    const zeroY = (padding.top + pricePlotHeight).toFixed(1);
    return `${primaryPathStr} L ${lastX},${zeroY} L ${firstX},${zeroY} Z`;
  }, [primaryPathStr, primaryPoints, padding.top, pricePlotHeight]);

  // Build benchmark SVG path points
  const benchmarkPoints = useMemo(() => {
    if (!includeBenchmark || displayMode === 'drawdown' || activeBenchmark.length === 0) return [];
    return activeBenchmark.map((b, i) => {
      if (!b) return null;
      const x = getXFromIndex(i);
      let val = b.close;
      if (displayMode === 'return') {
        const ret = benchmarkCumReturns[i];
        if (ret === null) return null;
        val = ret;
      }
      const y = getYCoordinate(val);
      return { x, y, val };
    });
  }, [includeBenchmark, displayMode, activeBenchmark, benchmarkCumReturns, getXFromIndex, yMin, yMax]);

  const benchmarkPathStr = useMemo(() => {
    const valid = benchmarkPoints.filter((p): p is { x: number; y: number; val: number } => p !== null);
    if (valid.length === 0) return '';
    return `M ${valid.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`;
  }, [benchmarkPoints]);

  // Default active index to latest point if not hovering
  const inspectIndex = activeIndex !== null ? activeIndex : activeData.length - 1;
  const inspectedDataPoint = activeData[inspectIndex] || null;
  const inspectedBenchmarkPoint = activeBenchmark[inspectIndex] || null;

  // Change relative to window base
  const windowChange = useMemo(() => {
    if (activeData.length < 2) return { dollar: 0, pct: 0 };
    const first = activeData[0].close;
    const current = inspectedDataPoint ? inspectedDataPoint.close : activeData[activeData.length - 1].close;
    return {
      dollar: current - first,
      pct: first > 0 ? (current - first) / first : 0,
    };
  }, [activeData, inspectedDataPoint]);

  // Format axis label ticks
  const formatYAxisTick = (val: number): string => {
    if (displayMode === 'price') return `$${val.toFixed(1)}`;
    if (displayMode === 'return' || displayMode === 'drawdown') return `${(val * 100).toFixed(1)}%`;
    return String(val);
  };

  // Empty state handling
  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-stone-200 rounded-xs p-6 text-center space-y-2">
        <AlertCircle className="w-6 h-6 text-stone-400 mx-auto" />
        <div className="text-sm font-medium text-stone-800 font-sans">No Historical Observations</div>
        <p className="text-xs text-stone-500 font-sans max-w-md mx-auto">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-stone-200 rounded-xs overflow-hidden select-none font-mono">
      {/* 1. Terminal Header Bar: Title, Live Readout & Controls */}
      <div className="border-b border-stone-200 bg-stone-50/70 p-3 sm:px-4 sm:py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Left: Security Identity & Live Crosshair Readout */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-900 text-sm font-mono tracking-tight">
              {symbol}
            </span>
            {title && (
              <span className="text-stone-600 font-sans text-xs hidden sm:inline truncate max-w-[200px]">
                {title}
              </span>
            )}
          </div>

          {inspectedDataPoint && (
            <div className="flex items-baseline gap-2.5">
              <span className="text-base font-bold text-stone-900 font-mono tracking-tight">
                {formatCurrency(inspectedDataPoint.close)}
              </span>

              <span
                className={`text-xs font-semibold font-mono ${
                  windowChange.dollar >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {windowChange.dollar >= 0 ? '+' : ''}
                {formatCurrency(windowChange.dollar)} ({formatPercent(windowChange.pct, 2, true)})
              </span>

              <span className="text-[11px] text-stone-500 font-sans hidden sm:inline">
                {formatDateDisplay(inspectedDataPoint.date, 'tooltip')}
              </span>
            </div>
          )}
        </div>

        {/* Right: Mode Switcher & Range Selectors */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Mode Switcher */}
          <div className="flex rounded-xs border border-stone-300 bg-white p-0.5 text-[11px] font-sans">
            <button
              onClick={() => setDisplayMode('price')}
              className={`px-2.5 py-1 rounded-xs transition-colors font-medium ${
                displayMode === 'price'
                  ? 'bg-stone-900 text-stone-50 font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Nominal Price ($)"
            >
              Price
            </button>
            <button
              onClick={() => setDisplayMode('return')}
              className={`px-2.5 py-1 rounded-xs transition-colors font-medium flex items-center gap-1 ${
                displayMode === 'return'
                  ? 'bg-stone-900 text-stone-50 font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Normalized Return (% vs SPY)"
            >
              <TrendingUp className="w-3 h-3" />
              <span>% Return</span>
            </button>
            <button
              onClick={() => setDisplayMode('drawdown')}
              className={`px-2.5 py-1 rounded-xs transition-colors font-medium flex items-center gap-1 ${
                displayMode === 'drawdown'
                  ? 'bg-stone-900 text-stone-50 font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Peak-to-Trough Drawdown (%)"
            >
              <TrendingDown className="w-3 h-3" />
              <span>Drawdown</span>
            </button>
          </div>

          {/* Time Range Selector Buttons */}
          <div className="flex rounded-xs border border-stone-300 bg-white p-0.5 text-[11px] font-mono">
            {(['1M', '3M', '6M', 'YTD', '1Y', 'MAX'] as TimeRangeOption[]).map((r) => {
              const status = rangeAvailability[r];
              const isActive = timeRange === r;

              return (
                <button
                  key={r}
                  onClick={() => status.available && setTimeRange(r)}
                  disabled={!status.available}
                  title={status.reason || `Display ${r} historical observations`}
                  className={`px-2 py-0.5 rounded-xs transition-colors ${
                    isActive
                      ? 'bg-stone-900 text-stone-50 font-bold'
                      : status.available
                      ? 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                      : 'text-stone-300 cursor-not-allowed opacity-50'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>

          {/* Reset View Button */}
          {timeRange !== 'MAX' && (
            <button
              onClick={() => setTimeRange('MAX')}
              className="px-2 py-1 text-[11px] font-sans text-stone-600 hover:text-stone-900 bg-white border border-stone-300 rounded-xs flex items-center gap-1"
              title="Fit all historical observations"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Fit</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Interactive SVG Canvas with Precision Crosshair */}
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
            {/* Soft editorial area gradient */}
            <linearGradient id="editorialAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#334155" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0.0" />
            </linearGradient>

            {/* Negative drawdown gradient */}
            <linearGradient id="drawdownGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#be123c" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#be123c" stopOpacity="0.16" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines and Right Y-Axis Labels */}
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
                  {formatYAxisTick(tick)}
                </text>
              </g>
            );
          })}

          {/* Zero baseline for % Return or Drawdown mode */}
          {(displayMode === 'return' || displayMode === 'drawdown') && (
            <line
              x1={padding.left}
              y1={getYCoordinate(0)}
              x2={chartWidth - padding.right}
              y2={getYCoordinate(0)}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          )}

          {/* Volume Histogram Bars (bottom panel) */}
          {showVolume &&
            activeData.map((d, i) => {
              const x = getXFromIndex(i);
              const barW = Math.max(4, Math.min(18, plotWidth / (activeData.length * 2)));
              const volFrac = (d.volume || 0) / maxVolume;
              const barH = volFrac * volumeHeight;
              const barY = height - padding.bottom + (volumeHeight - barH);
              const isInspect = i === inspectIndex;

              return (
                <g key={`vol-${i}`}>
                  <rect
                    x={x - barW / 2}
                    y={barY}
                    width={barW}
                    height={barH}
                    fill={isInspect ? '#94a3b8' : '#e2e8f0'}
                    rx="1"
                  />
                </g>
              );
            })}

          {/* Shaded Area */}
          <path
            d={primaryAreaStr}
            fill={displayMode === 'drawdown' ? 'url(#drawdownGrad)' : 'url(#editorialAreaGrad)'}
          />

          {/* Benchmark Series Line (when Return mode or toggled) */}
          {includeBenchmark && displayMode !== 'drawdown' && benchmarkPathStr && (
            <path
              d={benchmarkPathStr}
              fill="none"
              stroke="#d97706"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              strokeLinecap="round"
            />
          )}

          {/* Primary Series Line */}
          <path
            d={primaryPathStr}
            fill="none"
            stroke={displayMode === 'drawdown' ? '#be123c' : primaryColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Time Axis Date Labels & Tick Marks */}
          {activeData.map((d, i) => {
            const x = getXFromIndex(i);
            const isInspect = i === inspectIndex;

            // Reduce crowding if many points
            const shouldShowLabel =
              activeData.length <= 8 ||
              i === 0 ||
              i === activeData.length - 1 ||
              i % Math.ceil(activeData.length / 6) === 0;

            return (
              <g key={`x-tick-${i}`}>
                <line
                  x1={x}
                  y1={height - padding.bottom}
                  x2={x}
                  y2={height - padding.bottom + 4}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
                {shouldShowLabel && (
                  <text
                    x={x}
                    y={height - (showVolume ? 8 : 10)}
                    fill={isInspect ? '#0f172a' : '#64748b'}
                    fontWeight={isInspect ? '600' : '400'}
                    fontSize="9.5"
                    fontFamily="IBM Plex Mono, monospace"
                    textAnchor={i === 0 ? 'start' : i === activeData.length - 1 ? 'end' : 'middle'}
                  >
                    {formatDateDisplay(d.date, activeData.length > 12 ? 'compact' : 'axis')}
                  </text>
                )}
              </g>
            );
          })}

          {/* Interactive Snapping Crosshair Lines */}
          {inspectedDataPoint && (
            <g className="pointer-events-none">
              {/* Vertical Crosshair Guide */}
              <line
                x1={getXFromIndex(inspectIndex)}
                y1={padding.top}
                x2={getXFromIndex(inspectIndex)}
                y2={height - padding.bottom}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="3 3"
              />

              {/* Horizontal Price Crosshair Guide */}
              {primaryPoints[inspectIndex] && (
                <>
                  <line
                    x1={padding.left}
                    y1={primaryPoints[inspectIndex].y}
                    x2={chartWidth - padding.right}
                    y2={primaryPoints[inspectIndex].y}
                    stroke="#64748b"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />

                  {/* Pinned Right Axis Badge */}
                  <rect
                    x={chartWidth - padding.right}
                    y={primaryPoints[inspectIndex].y - 9}
                    width={padding.right}
                    height={18}
                    fill="#0f172a"
                    rx="1"
                  />
                  <text
                    x={chartWidth - padding.right + 4}
                    y={primaryPoints[inspectIndex].y + 3.5}
                    fill="#ffffff"
                    fontSize="9.5"
                    fontFamily="IBM Plex Mono, monospace"
                    fontWeight="600"
                    textAnchor="start"
                  >
                    {formatYAxisTick(primaryPoints[inspectIndex].val)}
                  </text>
                </>
              )}

              {/* Primary Point Marker Dot */}
              {primaryPoints[inspectIndex] && (
                <circle
                  cx={primaryPoints[inspectIndex].x}
                  cy={primaryPoints[inspectIndex].y}
                  r="4.5"
                  fill="#ffffff"
                  stroke={displayMode === 'drawdown' ? '#be123c' : primaryColor}
                  strokeWidth="2.5"
                />
              )}

              {/* Benchmark Point Marker Dot */}
              {includeBenchmark &&
                benchmarkPoints[inspectIndex] && (
                  <circle
                    cx={benchmarkPoints[inspectIndex].x}
                    cy={benchmarkPoints[inspectIndex].y}
                    r="3.5"
                    fill="#ffffff"
                    stroke="#d97706"
                    strokeWidth="2"
                  />
                )}
            </g>
          )}
        </svg>

        {/* 3. Floating Institutional Data Inspector Tooltip */}
        {isHovered && inspectedDataPoint && (
          <div
            className="absolute z-20 pointer-events-none transition-transform duration-75 ease-out"
            style={{
              left: `${(getXFromIndex(inspectIndex) / chartWidth) * 100}%`,
              transform:
                inspectIndex > activeData.length * 0.6
                  ? 'translateX(calc(-100% - 14px))'
                  : 'translateX(14px)',
              top: '16px',
            }}
          >
            <div className="bg-stone-900/95 text-stone-100 rounded-xs px-3 py-2.5 shadow-lg border border-stone-800 text-[11px] font-mono space-y-1.5 backdrop-blur-xs min-w-[200px]">
              <div className="flex justify-between items-center border-b border-stone-700/80 pb-1 text-[10px] text-stone-400">
                <span className="font-semibold text-stone-200">
                  {formatDateDisplay(inspectedDataPoint.date, 'tooltip')}
                </span>
                <span>{inspectedDataPoint.provider || 'Twelve Data'}</span>
              </div>

              {/* Primary Series Metrics */}
              <div className="space-y-0.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: primaryColor }}
                    />
                    {symbol} Close:
                  </span>
                  <span className="font-bold text-stone-100">
                    {formatCurrency(inspectedDataPoint.close)}
                  </span>
                </div>

                {primaryPeriodReturns[inspectIndex] !== null && (
                  <div className="flex justify-between items-center text-[10px] text-stone-300">
                    <span>MoM Change:</span>
                    <span
                      className={
                        primaryPeriodReturns[inspectIndex]! >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }
                    >
                      {formatPercent(primaryPeriodReturns[inspectIndex]!, 2, true)}
                    </span>
                  </div>
                )}

                {displayMode === 'return' && (
                  <div className="flex justify-between items-center text-[10px] text-stone-300">
                    <span>Cumulative Return:</span>
                    <span
                      className={
                        primaryCumReturns[inspectIndex] >= 0
                          ? 'text-emerald-400 font-bold'
                          : 'text-rose-400 font-bold'
                      }
                    >
                      {formatPercent(primaryCumReturns[inspectIndex], 2, true)}
                    </span>
                  </div>
                )}

                {displayMode === 'drawdown' && (
                  <div className="flex justify-between items-center text-[10px] text-rose-300">
                    <span>Rolling Drawdown:</span>
                    <span className="font-bold">
                      {formatPercent(primaryDrawdowns[inspectIndex].drawdown, 2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Benchmark Series Readout */}
              {includeBenchmark && inspectedBenchmarkPoint && (
                <div className="pt-1.5 border-t border-stone-800 space-y-0.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-amber-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                      {benchmarkSymbol} Benchmark:
                    </span>
                    <span className="text-stone-200">
                      {formatCurrency(inspectedBenchmarkPoint.close)}
                    </span>
                  </div>

                  {displayMode === 'return' && benchmarkCumReturns[inspectIndex] !== null && (
                    <div className="flex justify-between items-center text-[10px] text-stone-400">
                      <span>Benchmark Return:</span>
                      <span className="text-amber-300">
                        {formatPercent(benchmarkCumReturns[inspectIndex]!, 2, true)}
                      </span>
                    </div>
                  )}

                  {displayMode === 'return' && benchmarkCumReturns[inspectIndex] !== null && (
                    <div className="flex justify-between items-center text-[10px] pt-0.5 font-bold">
                      <span className="text-stone-300">Active Spread / Alpha:</span>
                      <span
                        className={
                          primaryCumReturns[inspectIndex] - benchmarkCumReturns[inspectIndex]! >= 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }
                      >
                        {formatPercent(
                          primaryCumReturns[inspectIndex] - benchmarkCumReturns[inspectIndex]!,
                          2,
                          true
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Volume */}
              {inspectedDataPoint.volume > 0 && (
                <div className="pt-1 border-t border-stone-800 flex justify-between text-[10px] text-stone-400">
                  <span>Trading Volume:</span>
                  <span className="text-stone-300">
                    {formatLargeNumber(inspectedDataPoint.volume)} shares
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Sub-Panel: Draggable Time Range Navigator / Overview Track */}
      {showNavigator && data.length > 2 && (
        <div className="border-t border-stone-200 bg-stone-50/60 p-2 sm:px-4 flex items-center justify-between gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-2 text-stone-600 font-sans">
            <Sliders className="w-3.5 h-3.5 text-stone-500" />
            <span>Visible Range:</span>
            <span className="font-semibold text-stone-900 font-mono">
              {formatDateDisplay(activeData[0]?.date, 'compact')} –{' '}
              {formatDateDisplay(activeData[activeData.length - 1]?.date, 'compact')}
            </span>
            <span className="text-stone-400">({activeData.length} observations)</span>
          </div>

          <div className="flex items-center gap-3">
            {benchmarkData && benchmarkData.length > 0 && displayMode !== 'drawdown' && (
              <label className="flex items-center gap-1.5 text-stone-600 hover:text-stone-900 cursor-pointer text-xs font-sans">
                <input
                  type="checkbox"
                  checked={includeBenchmark}
                  onChange={(e) => setIncludeBenchmark(e.target.checked)}
                  className="rounded-xs text-stone-900 focus:ring-0"
                />
                <span>Overlay {benchmarkSymbol}</span>
              </label>
            )}

            <span className="text-stone-400 hidden sm:inline">·</span>
            <span className="text-stone-500 text-[10px] hidden sm:inline font-sans">
              Monthly Close Audited Series
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
