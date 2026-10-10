/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Institutional Financial Visualizations & Precision Charts
 *
 * Professional Bloomberg / TradingView terminal-grade visualization suite:
 * - FinancialTimeSeriesChart: Precision interactive time-series with crosshair, tooltip, range filter, and benchmark overlay
 * - TrajectoryInteractiveChart: Multi-year compounding trajectory with liability reserve PV ground zero marker
 * - StressScenarioInteractiveChart: Institutional macroeconomic shock loss profile with bar inspection
 * - AllocationInteractiveChart: Proportional capital & weight allocation with segment hover synchronization
 */

import React from 'react';
import {
  FinancialTimeSeriesChart,
  FinancialTimeSeriesChartProps,
} from '../charts/FinancialTimeSeriesChart';
import {
  TrajectoryInteractiveChart,
  TrajectoryInteractiveChartProps,
} from '../charts/TrajectoryInteractiveChart';
import {
  StressScenarioInteractiveChart,
  StressScenarioInteractiveChartProps,
} from '../charts/StressScenarioInteractiveChart';
import {
  AllocationInteractiveChart,
  AllocationInteractiveChartProps,
} from '../charts/AllocationInteractiveChart';
import { MonthlyPricePoint } from '../../types/quantTypes';

// Re-export chart modules
export {
  FinancialTimeSeriesChart,
  TrajectoryInteractiveChart,
  StressScenarioInteractiveChart,
  AllocationInteractiveChart,
};

/**
 * Backwards-compatible PriceLineChart wrapper that routes to FinancialTimeSeriesChart.
 */
export const PriceLineChart: React.FC<{
  data: MonthlyPricePoint[];
  symbol?: string;
  title?: string;
  benchmarkData?: MonthlyPricePoint[];
  benchmarkSymbol?: string;
  color?: string;
  height?: number;
  emptyMessage?: string;
}> = ({
  data,
  symbol,
  title,
  benchmarkData,
  benchmarkSymbol = 'SPY',
  color = '#1e293b',
  height = 280,
  emptyMessage,
}) => {
  return (
    <FinancialTimeSeriesChart
      data={data}
      symbol={symbol}
      title={title}
      benchmarkData={benchmarkData}
      benchmarkSymbol={benchmarkSymbol}
      primaryColor={color}
      height={height}
      emptyMessage={emptyMessage}
    />
  );
};

/**
 * Backwards-compatible AllocationBarChart wrapper that routes to AllocationInteractiveChart.
 */
export const AllocationBarChart: React.FC<{
  items: { label: string; weight: number; color: string; currentValue?: number; sector?: string }[];
  totalCapital?: number;
  title?: string;
  onSelectItem?: (item: any) => void;
}> = ({ items, totalCapital, title, onSelectItem }) => {
  return (
    <AllocationInteractiveChart
      items={items}
      totalCapital={totalCapital}
      title={title}
      onSelectItem={onSelectItem}
    />
  );
};

/**
 * Backwards-compatible StressScenarioBars wrapper that routes to StressScenarioInteractiveChart.
 */
export const StressScenarioBars: React.FC<{
  scenarios: { name: string; lossPct: number; lossDollar: number; description?: string }[];
  title?: string;
  onSelectScenario?: (scenario: any) => void;
}> = ({ scenarios, title, onSelectScenario }) => {
  return (
    <StressScenarioInteractiveChart
      scenarios={scenarios}
      title={title}
      onSelectScenario={onSelectScenario}
    />
  );
};

/**
 * Backwards-compatible TrajectoryCurveChart wrapper that routes to TrajectoryInteractiveChart.
 */
export const TrajectoryCurveChart: React.FC<{
  schedule: any[];
  reservePV: number;
  height?: number;
}> = ({ schedule, reservePV, height = 280 }) => {
  const reserveSpec = {
    initialCapital: 100000,
    beginning2033CapitalBaseline: schedule[schedule.length - 1]?.beginningCapital || 721532,
    beginning2033CapitalStressed: 432850,
    discountRateAssumption: 0.045,
    annualNominalCommitment: 10000,
    commitmentYears: 5,
    totalNominalLiabilities: 50000,
    reservePVBeginning2033: reservePV,
    residualCapitalBaseline: (schedule[schedule.length - 1]?.beginningCapital || 721532) - reservePV,
    residualCapitalStressed: 432850 - reservePV,
  };

  return (
    <TrajectoryInteractiveChart
      schedule={schedule}
      reserveSpec={reserveSpec}
      height={height}
    />
  );
};
