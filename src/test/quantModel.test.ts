/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Quantitative Model & Data Integrity Test Suite
 */

import {
  CASE_METADATA,
  UNIVERSE_SECURITIES,
  CURRENT_PORTFOLIO_METRICS,
  MARGINAL_FIT_AMZN_10PCT,
  PHASE6_CONSTRUCTION_PROPOSALS,
  PHASE7_STRESS_SCENARIOS,
  LIABILITY_RESERVE_SPEC,
  DEFAULT_CIO_DECISION_RECORD,
} from '../data/quantModelData';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`TEST ASSERTION FAILED: ${msg}`);
  }
}

console.log('Running Wharton Growth Sleeve Model Integrity Tests...\n');

// 1. Case Metadata Checks
assert(CASE_METADATA.initialCapital === 100000, 'Initial capital must be $100,000');
assert(CASE_METADATA.horizonYears === 10, 'Horizon must be 10 years');
assert(CASE_METADATA.targetYear === 2033, 'Target year must be 2033');
assert(CASE_METADATA.benchmarkSymbol === 'SPY', 'Market benchmark must be S&P 500 (SPY)');
console.log('✓ 1. Case Metadata Verified');

// 2. Universe Security Invariants & Multi-Vendor Integrity
const aapl = UNIVERSE_SECURITIES.find((s) => s.symbol === 'AAPL');
const msft = UNIVERSE_SECURITIES.find((s) => s.symbol === 'MSFT');
const nvda = UNIVERSE_SECURITIES.find((s) => s.symbol === 'NVDA');
const amzn = UNIVERSE_SECURITIES.find((s) => s.symbol === 'AMZN');

assert(aapl !== undefined && aapl.dataReadiness === 'READY', 'AAPL must be READY');
assert(msft !== undefined && msft.dataReadiness === 'READY', 'MSFT must be READY');
assert(nvda !== undefined && nvda.dataReadiness === 'PARTIAL', 'NVDA must be PARTIAL due to D/E discrepancy');
assert(amzn !== undefined && amzn.dataReadiness === 'READY', 'AMZN must be READY');
console.log('✓ 2. Universe Data Readiness & Multi-Vendor Integrity Preserved');

// 3. Multi-Provider Discrepancy & Non-Averaging Check
assert((nvda?.disagreements.length ?? 0) > 0, 'NVDA must retain explicit vendor discrepancy');
const nvdaDe = nvda?.disagreements.find((d) => d.metricKey === 'deRatio');
assert(nvdaDe !== undefined, 'NVDA D/E discrepancy must be logged');
assert(nvdaDe?.providerValues.length === 2, 'NVDA D/E must show both FMP (0.784) and AV (0.766)');
assert(nvdaDe?.selectedModelValue === 0.784, 'NVDA D/E selected value must follow PRIMARY_PROVIDER_PRECEDENCE');
assert(nvdaDe?.selectedModelValue !== (0.784 + 0.766) / 2, 'NVDA D/E must NOT be averaged');
console.log('✓ 3. Non-Averaging Discrepancy Invariant Enforced (NVDA D/E: 0.784 vs 0.766)');

// 4. Portfolio Fit (Before / After / Delta) Check
assert(MARGINAL_FIT_AMZN_10PCT.targetWeight === 0.1, 'AMZN marginal simulation target weight is 10%');
const fitMetrics = MARGINAL_FIT_AMZN_10PCT.metrics;
assert(
  Math.abs(fitMetrics.volatility.current - 0.1842) < 0.001,
  'Current portfolio volatility must match 18.42%'
);
assert(
  fitMetrics.volatility.proposed < fitMetrics.volatility.current,
  'Adding AMZN at 10% must reduce portfolio volatility via diversification'
);
console.log('✓ 4. Marginal Portfolio Fit (CURRENT -> PROPOSED -> DELTA) Verified');

// 5. Construction Proposals Check
assert(PHASE6_CONSTRUCTION_PROPOSALS.length === 4, 'Must contain all 4 Phase 6 proposals');
const p1 = PHASE6_CONSTRUCTION_PROPOSALS.find((p) => p.id === 'PROP-01');
assert(p1?.holdings.length === 3, 'Proposal 1 must hold 3 assets (AAPL, MSFT, CASH)');
const p2 = PHASE6_CONSTRUCTION_PROPOSALS.find((p) => p.id === 'PROP-02');
assert(p2?.metrics.betaSPY === 1.34, 'Proposal 2 Beta must be 1.34');
console.log('✓ 5. Phase 6 Construction Proposals Verified');

// 6. Deterministic Stress Testing Check
assert(PHASE7_STRESS_SCENARIOS.length === 5, 'Must contain 5 deterministic stress scenarios');
const s1 = PHASE7_STRESS_SCENARIOS.find((s) => s.id === 'STRESS-01');
assert(s1?.portfolioImpactPercent === -0.09, 'Scenario 1 impact must be -9.0%');
console.log('✓ 6. Phase 7 Deterministic Stress Scenarios Verified');

// 7. Liability Reserve & Timing Ground Truth Check
assert(
  LIABILITY_RESERVE_SPEC.reservePVBeginning2033 === 43899.8,
  'Beginning-2033 Reserve PV must be $43,899.80'
);
assert(
  LIABILITY_RESERVE_SPEC.residualCapitalBaseline === 721532.0 - 43899.8,
  'Residual capital must equal Beginning-2033 Capital minus Reserve PV'
);
console.log('✓ 7. Liability Reserve PV & Timing Boundary (Beginning-2033 Ground Zero) Verified');

// 8. CIO Governance Layer Check
assert(
  DEFAULT_CIO_DECISION_RECORD.mandateId === 'WGHSC-GROWTH-SLEEVE',
  'CIO decision record must reference mandate ID'
);
assert(
  DEFAULT_CIO_DECISION_RECORD.reviewStatus === 'PENDING_REVIEW',
  'CIO decision record must not presume automated approval'
);
console.log('✓ 8. CIO Governance & Decision Boundary Verified');

console.log('\nALL 8 MODEL INTEGRITY AUDIT TESTS PASSED SUCCESSFULLY!');
