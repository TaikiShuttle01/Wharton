/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Comprehensive Test Suite for User Research Universe, Custom Proposals, and Engine
 */

import {
  loadSavedUniverse,
  saveUniverse,
  addSecurityToUniverse,
  removeSecurityFromUniverse,
  loadUserProposals,
  saveUserProposals,
  createUserProposal,
  updateUserProposal,
  duplicateUserProposal,
  deleteUserProposal,
} from '../data/userStorage';
import { lookupSecurity, EXTENDED_SECURITY_CATALOG } from '../data/securityLookup';
import { evaluatePortfolioWeights, evaluateStressScenariosForHoldings } from '../data/quantEngine';
import { UNIVERSE_SECURITIES, CURRENT_PORTFOLIO_HOLDINGS } from '../data/quantModelData';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`TEST ASSERTION FAILED: ${msg}`);
  }
}

// Polyfill minimal localStorage for node CLI testing if needed
if (typeof localStorage === 'undefined') {
  const store = new Map<string, string>();
  (global as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, val),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
}

async function runAllTests() {
  console.log('Running User-Defined Growth Sleeve & Engine Integration Tests...\n');

  // --- 1. Security Lookup Tests ---
  console.log('Testing Security Lookup & Identity Resolution:');

  // Exact match
  const lookupAapl = await lookupSecurity('AAPL');
  assert(lookupAapl.status === 'FOUND', 'AAPL lookup must return FOUND');
  assert(lookupAapl.matches.length === 1 && lookupAapl.matches[0].symbol === 'AAPL', 'AAPL match must be exact');
  console.log('  ✓ Exact match lookup succeeds (AAPL)');

  // Name match
  const lookupGoogle = await lookupSecurity('Alphabet');
  assert(lookupGoogle.status === 'FOUND', 'Alphabet lookup must return FOUND');
  assert(lookupGoogle.matches.some(m => m.symbol === 'GOOGL'), 'Alphabet lookup must find GOOGL');
  console.log('  ✓ Name fuzzy match lookup succeeds (Alphabet -> GOOGL)');

  // Ambiguous match
  const lookupAmbiguous = await lookupSecurity('AMBIGUOUS');
  assert(lookupAmbiguous.status === 'UNVERIFIED', 'Ambiguous test query must return UNVERIFIED');
  console.log('  ✓ Ambiguous results classified as UNVERIFIED');

  // Not found
  const lookupNotFound = await lookupSecurity('NONEXISTENT_TICKER_XYZ');
  assert(lookupNotFound.status === 'NOT_FOUND', 'Nonexistent ticker must return NOT_FOUND');
  console.log('  ✓ Unknown ticker returns clean NOT_FOUND');

  // Error simulation
  const lookupError = await lookupSecurity('TIMEOUT');
  assert(lookupError.status === 'LOOKUP_ERROR', 'Timeout must return LOOKUP_ERROR');
  console.log('  ✓ Provider operational failures return LOOKUP_ERROR without false existence claim');

  // --- 2. Personal Research Universe & Persistence Tests ---
  console.log('\nTesting Browser Persistence & Research Universe:');
  localStorage.clear();

  // Initial universe loading
  const initialUniv = loadSavedUniverse();
  assert(initialUniv.length >= 4, 'Default universe must load at least 4 baseline securities');
  console.log('  ✓ Initial research universe bootstrapped from baseline');

  // Prevent duplicate additions
  const addAaplAgain = addSecurityToUniverse(initialUniv[0]);
  assert(!addAaplAgain.success, 'Adding existing security (AAPL) must fail duplicate check');
  console.log('  ✓ Duplicate security addition rejected gracefully');

  // Add new security (GOOGL)
  const googl = EXTENDED_SECURITY_CATALOG.find(s => s.symbol === 'GOOGL')!;
  const addGoogl = addSecurityToUniverse(googl);
  assert(addGoogl.success, 'Adding new candidate (GOOGL) must succeed');
  const afterAdd = loadSavedUniverse();
  assert(afterAdd.some(s => s.symbol === 'GOOGL'), 'GOOGL must be in saved universe');
  console.log('  ✓ New resolved security persisted to research universe');

  // Removal from saved universe
  const removeRes = removeSecurityFromUniverse('GOOGL');
  assert(removeRes.success, 'Removal of GOOGL must succeed');
  const afterRemove = loadSavedUniverse();
  assert(!afterRemove.some(s => s.symbol === 'GOOGL'), 'GOOGL must be removed from universe');
  console.log('  ✓ Security removal from universe succeeds');

  // --- 3. User Proposal Builder & Allocation Tests ---
  console.log('\nTesting User-Defined Proposal Construction:');

  // Load default proposals
  const proposals = loadUserProposals();
  assert(proposals.length >= 4, 'Must load default proposals');
  console.log('  ✓ Proposals loaded and evaluated from storage');

  // Create custom proposal
  const myProp = createUserProposal(
    'My Balanced Tech Sleeve',
    [
      { symbol: 'AAPL', weight: 0.35 },
      { symbol: 'MSFT', weight: 0.35 },
      { symbol: 'NVDA', weight: 0.20 },
      { symbol: 'CASH', weight: 0.10 },
    ],
    'Analyst custom test proposal'
  );
  assert(myProp.id.startsWith('PROP-'), 'Custom proposal ID must be generated');
  console.log('  ✓ Custom proposal created with stable ID');

  // Incomplete draft proposal saving
  const draftProp = createUserProposal(
    'Draft Incomplete Proposal',
    [
      { symbol: 'AAPL', weight: 0.40 },
    ],
    'Unfinished allocation draft',
    true // isDraft
  );
  assert(draftProp.isDraft, 'Draft proposal must retain isDraft flag');
  console.log('  ✓ Incomplete draft proposals can be saved without blocking');

  // Duplicate proposal
  const dup = duplicateUserProposal(myProp.id);
  assert(dup !== null && dup.id !== myProp.id, 'Duplicated proposal must have distinct unique ID');
  assert(Boolean(dup?.name.includes('(Copy)')), 'Duplicated proposal name reflects copy');
  console.log('  ✓ Proposal duplication generates independent snapshot');

  // Delete proposal
  const deleteOk = deleteUserProposal(dup!.id);
  assert(deleteOk, 'Delete proposal must return true');
  const propsAfterDelete = loadUserProposals();
  assert(!propsAfterDelete.some(p => p.id === dup!.id), 'Deleted proposal must be removed');
  console.log('  ✓ Proposal deletion succeeds cleanly');

  // --- 4. Quantitative Engine Integration & Arbitrary Weight Evaluation ---
  console.log('\nTesting Quantitative Engine Mathematical Evaluation:');

  // Evaluate baseline holdings
  const currentHoldings = CURRENT_PORTFOLIO_HOLDINGS.map(h => ({ symbol: h.symbol, weight: h.weight }));
  const evalCurrent = evaluatePortfolioWeights(currentHoldings);
  assert(evalCurrent.isValid, 'Current portfolio weights must evaluate as valid');
  assert(evalCurrent.metrics.expectedReturn > 0.20, 'Expected return must be computed');
  assert(evalCurrent.metrics.volatility > 0.15, 'Volatility must be computed from covariance matrix');
  assert(evalCurrent.metrics.sharpeRatio > 0.8, 'Sharpe ratio must be computed');
  assert(evalCurrent.metrics.betaSPY > 1.0, 'Portfolio beta must be computed');
  console.log('  ✓ Full mathematical evaluation of current portfolio verified');

  // Test custom proposal evaluation
  const evalCustom = evaluatePortfolioWeights(myProp.holdings);
  assert(evalCustom.isValid, 'Valid 100% custom proposal must evaluate as valid');
  console.log('  ✓ Arbitrary user-defined weights evaluated by engine');

  // Test invalid allocation (under 100%)
  const evalUnder = evaluatePortfolioWeights([{ symbol: 'AAPL', weight: 0.50 }]);
  assert(!evalUnder.isValid, '50% allocation must fail valid investment check');
  assert(Boolean(evalUnder.validationError?.includes('100.0%')), 'Validation error must clearly state requirement');
  console.log('  ✓ Incomplete allocation rejected for evaluation with actionable message');

  // Test negative weight rejection
  const evalNeg = evaluatePortfolioWeights([
    { symbol: 'AAPL', weight: 1.10 },
    { symbol: 'MSFT', weight: -0.10 },
  ]);
  assert(!evalNeg.isValid, 'Negative weight must fail long-only validation');
  console.log('  ✓ Negative weights strictly rejected per long-only mandate');

  // Test duplicate symbols in single proposal
  const evalDupSym = evaluatePortfolioWeights([
    { symbol: 'AAPL', weight: 0.50 },
    { symbol: 'AAPL', weight: 0.50 },
  ]);
  assert(!evalDupSym.isValid, 'Duplicate symbols must be rejected');
  console.log('  ✓ Duplicate holdings in single proposal detected and rejected');

  // Stress test evaluation
  const stressResults = evaluateStressScenariosForHoldings(myProp.holdings);
  assert(stressResults.length === 5, 'Must evaluate all 5 Phase 7 deterministic scenarios');
  assert(stressResults[0].portfolioImpactPercent < 0, 'Scenario 1 impact must be negative loss');
  console.log('  ✓ Phase 7 deterministic stress impacts computed for arbitrary user holdings');

  console.log('\nALL USER PORTFOLIO BUILDER & ENGINE TESTS PASSED!\n');
}

runAllTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
