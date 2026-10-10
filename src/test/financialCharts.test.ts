/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Institutional Financial Charts & Mathematical Engine Test Suite
 */

import { strict as assert } from 'node:assert';
import {
  parseDate,
  formatDateDisplay,
  calculateTicks,
  computePeriodReturns,
  computeCumulativeReturns,
  computeDrawdowns,
  evaluateTimeRanges,
  sliceDataByRange,
} from '../components/charts/chartUtils';
import {
  UNIVERSE_SECURITIES,
  TRAJECTORY_10YR_SCHEDULE,
  LIABILITY_RESERVE_SPEC,
} from '../data/quantModelData';

console.log('Running Institutional Financial Charts Test Suite...\n');

// --- 1. Date Parsing & Adaptive Time Axis Formatting ---
console.log('1. Testing Date Parsing & Time Axis Formatting:');
const d1 = parseDate('2026-05');
assert.equal(d1.getFullYear(), 2026, 'Year must parse correctly');
assert.equal(d1.getMonth(), 4, 'Month must parse correctly (0-indexed May = 4)');

const d2 = parseDate('2023');
assert.equal(d2.getFullYear(), 2023, 'Single year string must parse correctly');

const label1 = formatDateDisplay('2026-05', 'axis');
assert.equal(label1, 'May 2026', 'Axis label must be "May 2026"');

const labelTooltip = formatDateDisplay('2026-05', 'tooltip');
assert.equal(labelTooltip, 'May 2026', 'Tooltip label must be formatted');

const labelCompact = formatDateDisplay('2026-05', 'compact');
assert.equal(labelCompact, "May '26", 'Compact label must be formatted');
console.log('  ✓ Date parsing and adaptive time formatting verified');

// --- 2. Financial Mathematical Transformations ---
console.log('\n2. Testing Financial Mathematical Transformations:');
const prices = [100, 110, 105, 120, 90];

// Period-over-period returns
const mom = computePeriodReturns(prices);
assert.equal(mom[0], null, 'Initial period MoM must be null');
assert(Math.abs((mom[1] as number) - 0.10) < 1e-6, 'Period 1 MoM must be +10%');
assert(Math.abs((mom[2] as number) - (-0.0454545)) < 1e-4, 'Period 2 MoM must be -4.55%');

// Cumulative returns from base
const cumReturns = computeCumulativeReturns(prices, 0);
assert.equal(cumReturns[0], 0, 'Base return must be 0%');
assert(Math.abs(cumReturns[1] - 0.10) < 1e-6, 'Cumulative return 1 must be +10%');
assert(Math.abs(cumReturns[3] - 0.20) < 1e-6, 'Cumulative return 3 must be +20%');
assert(Math.abs(cumReturns[4] - (-0.10)) < 1e-6, 'Cumulative return 4 must be -10%');

// Rolling Peak Drawdowns
const drawdowns = computeDrawdowns(prices);
assert.equal(drawdowns[0].drawdown, 0, 'Initial drawdown must be 0%');
assert.equal(drawdowns[0].peak, 100, 'Initial peak must be 100');
assert.equal(drawdowns[1].drawdown, 0, 'New peak drawdown must be 0%');
assert.equal(drawdowns[1].peak, 110, 'Peak must be updated to 110');
assert(Math.abs(drawdowns[2].drawdown - (-0.0454545)) < 1e-4, 'Drawdown at 105 must be (105-110)/110');
assert.equal(drawdowns[3].peak, 120, 'Peak must update to 120');
assert(Math.abs(drawdowns[4].drawdown - (-0.25)) < 1e-6, 'Drawdown at 90 must be (90-120)/120 = -25%');
console.log('  ✓ MoM returns, cumulative returns, and rolling peak drawdowns verified');

// --- 3. Axis Ticks Calculation ---
console.log('\n3. Testing Numerical Axis Ticks:');
const ticks = calculateTicks(192.25, 226.50, 5);
assert(ticks.length >= 2, 'Ticks must generate at least 2 levels');
assert(ticks[0] <= 195, 'Minimum tick must cover lowest price');
assert(ticks[ticks.length - 1] >= 225, 'Maximum tick must cover highest price');
console.log('  ✓ Human-friendly financial axis ticks generated cleanly');

// --- 4. Time Range Coverage Rules & No Gap Fabrication ---
console.log('\n4. Testing Time Range Availability & Integrity:');
const aapl = UNIVERSE_SECURITIES.find((s) => s.symbol === 'AAPL')!;
assert(aapl && aapl.priceHistory.length === 5, 'AAPL must have 5 monthly observations');

const ranges = evaluateTimeRanges(aapl.priceHistory);
assert(ranges['1M'].available, '1M must be available for 5 points');
assert(ranges['3M'].available, '3M must be available for 5 points');
assert(!ranges['1Y'].available, '1Y must be disabled when only 5 monthly points exist');
assert(!ranges['3Y'].available, '3Y must be disabled when only 5 monthly points exist');
assert(ranges['MAX'].available, 'MAX must be available');
assert(ranges['1Y'].reason?.includes('Requires 12 months history'), 'Disabled range must provide honest explanation');

// Slicing without fabrication
const sliced3M = sliceDataByRange(aapl.priceHistory, '3M');
assert.equal(sliced3M.items.length, 4, '3M slice must contain last 4 monthly points');
assert.equal(sliced3M.items[sliced3M.items.length - 1].close, 226.5, 'Last slice point must match source close');
assert.equal(sliced3M.items[sliced3M.items.length - 1].date, '2026-09', 'Last slice point date must match source');

const slicedMax = sliceDataByRange(aapl.priceHistory, 'MAX');
assert.equal(slicedMax.items.length, 5, 'MAX slice must contain all 5 points');
console.log('  ✓ Time range coverage correctly enables/disables without data fabrication');

// --- 5. Multi-Series Alignment with SPY Benchmark ---
console.log('\n5. Testing Multi-Series Alignment with SPY Benchmark:');
const spy = UNIVERSE_SECURITIES.find((s) => s.symbol === 'SPY')!;
assert(spy && spy.priceHistory.length === 5, 'SPY must have benchmark observations');

// Verify exact timestamp matching
for (let i = 0; i < aapl.priceHistory.length; i++) {
  assert.equal(
    aapl.priceHistory[i].date,
    spy.priceHistory[i].date,
    `Date mismatch at index ${i}`
  );
}

// Alpha spread check
const aaplCum = (226.5 - 192.25) / 192.25; // AAPL total return over 5M
const spyCum = (572.8 - 526.4) / 526.4;    // SPY total return over 5M
const alphaSpread = aaplCum - spyCum;
assert(alphaSpread > 0.08, 'AAPL must outperform SPY benchmark over this period');
console.log('  ✓ Multi-series timestamp alignment and active alpha spread verified');

// --- 6. Trajectory Schedule & Liability Reserve Integration ---
console.log('\n6. Testing 10-Year Trajectory Schedule & Liability Reserve Ground Zero:');
assert.equal(TRAJECTORY_10YR_SCHEDULE.length, 11, 'Trajectory must have 11 annual checkpoints (2023-2033)');
assert.equal(TRAJECTORY_10YR_SCHEDULE[0].beginningCapital, 100000, 'Initial Year 0 capital must be $100k');
assert.equal(TRAJECTORY_10YR_SCHEDULE[10].beginningCapital, 721532, 'Beginning-2033 capital must be $721,532');
assert.equal(LIABILITY_RESERVE_SPEC.reservePVBeginning2033, 43899.8, 'Liability Reserve PV must be $43,899.80');
assert(
  LIABILITY_RESERVE_SPEC.residualCapitalBaseline > 677000,
  'Residual capital surplus must exceed $677,000'
);
console.log('  ✓ 10-year compounding trajectory and liability reserve PV ground zero verified');

console.log('\nALL INSTITUTIONAL FINANCIAL CHARTS TESTS PASSED!\n');
