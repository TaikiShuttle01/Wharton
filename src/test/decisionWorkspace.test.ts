/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Wharton Global High School Investment Competition - Quantitative Growth Sleeve
 * Decision & Risk Workspace Integration and Mathematical Verification Test Suite
 */

import {
  createDefaultDecisionRecord,
  loadDecisionRecord,
  saveDecisionRecord,
  loadAllDecisionRecords,
  deleteDecisionRecord,
  PersistentDecisionRecord,
} from '../data/decisionStorage';
import {
  createOfficialCaseFacts,
  createDefaultAssumptions,
  createDefaultPolicies,
} from '../data/caseStorage';
import { CaseProfile } from '../types/caseTypes';
import {
  evaluatePortfolioWeights,
  evaluateStressScenariosForHoldings,
  calculateCaseDerivedOutputs,
} from '../data/quantEngine';
import { CURRENT_PORTFOLIO_HOLDINGS, UNIVERSE_SECURITIES } from '../data/quantModelData';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

// In-memory mock localStorage for Node testing environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] || null,
    length: store.size,
  } as Storage;
}

console.log('Running Decision & Risk Workspace Verification Tests...');

// Setup test active case profile
const testProfile: CaseProfile = {
  id: 'wharton-official-baseline-2026-27',
  name: 'Wharton Official Baseline (2026–27)',
  description: 'Official test profile',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: 1,
  isBaseline: true,
  facts: createOfficialCaseFacts(),
  assumptions: createDefaultAssumptions(),
  policies: createDefaultPolicies(),
};

// Test 1: Decision Record Creation & Defaults
console.log('1. Testing Decision Record Creation & Default Integrity:');
const defaultRec = createDefaultDecisionRecord(
  testProfile.id,
  testProfile.version,
  testProfile.name,
  'PROP-01',
  1,
  'Core Quality Sleeve',
  1
);

assert(defaultRec.status === 'DRAFT', 'Default status must be DRAFT; never auto-approved');
assert(defaultRec.caseProfileId === testProfile.id, 'Case profile ID correctly set');
assert(defaultRec.proposalId === 'PROP-01', 'Proposal ID correctly set');
assert(defaultRec.teamRecommendation.stance === 'RECOMMEND', 'Team recommendation default stance');
assert(defaultRec.cioDecision.decisionMaker.length > 0, 'CIO decision maker default');
console.log('  ✓ Initial decision record initialized in clean DRAFT state without auto-approval');

// Test 2: Persistence & LocalStorage CRUD
console.log('2. Testing Decision Record Persistence & Version Tracking:');
defaultRec.teamRecommendation.writtenRationale = 'Test rationale for high quality sleeve';
defaultRec.status = 'PROPOSED';
const saveOk = saveDecisionRecord(defaultRec);
assert(saveOk, 'saveDecisionRecord must return true');

const reloaded = loadDecisionRecord(
  testProfile.id,
  testProfile.version,
  testProfile.name,
  'PROP-01',
  1,
  'Core Quality Sleeve',
  1
);
assert(reloaded.status === 'PROPOSED', 'Reloaded status matches saved PROPOSED state');
assert(
  reloaded.teamRecommendation.writtenRationale === 'Test rationale for high quality sleeve',
  'Written rationale persisted cleanly'
);

const all = loadAllDecisionRecords();
assert(Object.keys(all).length >= 1, 'All decision records contains at least 1 record');

const delOk = deleteDecisionRecord(testProfile.id, 'PROP-01');
assert(delOk, 'deleteDecisionRecord returns true');
const reloadedAfterDelete = loadDecisionRecord(
  testProfile.id,
  testProfile.version,
  testProfile.name,
  'PROP-01',
  1,
  'Core Quality Sleeve',
  1
);
assert(reloadedAfterDelete.status === 'DRAFT', 'After deletion, a clean DRAFT is loaded');
console.log('  ✓ Decision record persistence, retrieval, and deletion verified cleanly');

// Test 3: Proposal Impact Evaluation with Consistent Assumptions
console.log('3. Testing Proposal Impact Mathematical Engine Evaluation:');
const testCandidateHoldings = [
  { symbol: 'AAPL', weight: 0.30 },
  { symbol: 'MSFT', weight: 0.30 },
  { symbol: 'NVDA', weight: 0.25 },
  { symbol: 'AMZN', weight: 0.15 },
];

const curEval = evaluatePortfolioWeights(
  CURRENT_PORTFOLIO_HOLDINGS,
  testProfile.facts.initialContribution.value,
  testProfile.assumptions.riskFreeRate,
  UNIVERSE_SECURITIES,
  testProfile.policies
);

const propEval = evaluatePortfolioWeights(
  testCandidateHoldings,
  testProfile.facts.initialContribution.value,
  testProfile.assumptions.riskFreeRate,
  UNIVERSE_SECURITIES,
  testProfile.policies
);

assert(curEval.isValid, 'Current portfolio must be valid 100% allocation');
assert(propEval.isValid, 'Proposed portfolio must be valid 100% allocation');
assert(propEval.metrics.expectedReturn > 0, 'Expected return must be positive');
assert(propEval.metrics.volatility > 0, 'Volatility must be positive');
assert(propEval.metrics.betaSPY > 0, 'Portfolio beta to SPY must be positive');
assert(propEval.metrics.topHoldingsConcentration === 0.60, 'Top 2 holdings = 30% + 30% = 60%');

// Absolute changes
const returnDelta = propEval.metrics.expectedReturn - curEval.metrics.expectedReturn;
const volDelta = propEval.metrics.volatility - curEval.metrics.volatility;
assert(!isNaN(returnDelta), 'Return delta is numerical');
assert(!isNaN(volDelta), 'Volatility delta is numerical');
console.log(`  ✓ Proposal impact computed: E[R] delta: ${(returnDelta * 100).toFixed(2)}%, Vol delta: ${(volDelta * 100).toFixed(2)}%`);

// Test 4: Five Deterministic Stress Scenarios
console.log('4. Testing Deterministic Stress Scenario Losses on Proposal:');
const stressScenarios = evaluateStressScenariosForHoldings(
  testCandidateHoldings,
  testProfile.facts.initialContribution.value,
  UNIVERSE_SECURITIES
);

assert(stressScenarios.length === 5, 'Exactly 5 stress scenarios generated');
const sc1 = stressScenarios.find((s) => s.id === 'STRESS-01');
const sc2 = stressScenarios.find((s) => s.id === 'STRESS-02');
const sc3 = stressScenarios.find((s) => s.id === 'STRESS-03');
const sc4 = stressScenarios.find((s) => s.id === 'STRESS-04');
const sc5 = stressScenarios.find((s) => s.id === 'STRESS-05');

assert(Boolean(sc1 && sc2 && sc3 && sc4 && sc5), 'All 5 scenario IDs present');
assert(sc1!.portfolioImpactPercent === -0.10, 'Scenario 1 (Broad -10% equity) gives exactly -10% loss');
assert(sc2!.portfolioImpactPercent === -0.25, 'Scenario 2 (Severe -25% equity) gives exactly -25% loss');
assert(sc3!.portfolioImpactPercent < -0.30, 'Scenario 3 (2008 GFC Beta) produces heavy loss');
assert(
  sc1!.portfolioImpactDollar === -0.10 * testProfile.facts.initialContribution.value,
  `Scenario 1 gives -$30,000 on $300,000 initial capital (got ${sc1!.portfolioImpactDollar})`
);
console.log('  ✓ 5 Deterministic macro shock losses calculated from proposal weights');

// Test 5: Liability Reserve Integration & Shortfall/Surplus
console.log('5. Testing Liability Reserve Coverage and Surplus Invariants:');
const derived = calculateCaseDerivedOutputs(testProfile, propEval.metrics.expectedReturn);
assert(derived.reserveSpec.reservePVBeginning2033 > 400000, 'Reserve PV ~ $413k at 4.5% discount rate');
assert(derived.reserveSpec.beginning2033CapitalBaseline > 0, 'Compounded capital positive');
assert(derived.reserveCoverageRatioBaseline > 0, 'Reserve coverage ratio positive');
assert(
  Math.abs(
    derived.reserveSpec.residualCapitalBaseline -
      (derived.reserveSpec.beginning2033CapitalBaseline - derived.reserveSpec.reservePVBeginning2033)
  ) < 0.01,
  'Residual capital = Compounded Capital - Reserve PV'
);
console.log(`  ✓ Reserve PV: $${derived.reserveSpec.reservePVBeginning2033.toFixed(0)}, Coverage: ${(derived.reserveCoverageRatioBaseline * 100).toFixed(1)}%`);

console.log('======================================================');
console.log('ALL DECISION & RISK WORKSPACE TESTS PASSED CLEANLY!');
console.log('======================================================');
