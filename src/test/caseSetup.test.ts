/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Wharton Global High School Investment Competition - Quantitative Growth Sleeve
 * Persistent Case Setup, Calculation Engine & Validation Test Suite
 */

import {
  createOfficialCaseFacts,
  createDefaultAssumptions,
  createDefaultPolicies,
  createOfficialBaselineProfile,
  createLegacyBaselineProfile,
  loadCaseProfiles,
  saveCaseProfiles,
  getActiveCaseProfileId,
  setActiveCaseProfileId,
  getActiveCaseProfile,
  saveCaseProfile,
  duplicateCaseProfile,
  createCaseProfile,
  renameCaseProfile,
  restoreBaselineCaseProfile,
  deleteCaseProfile,
  exportProfileAsJson,
  importProfileFromJson,
  validateCaseProfile,
  OFFICIAL_BASELINE_PROFILE_ID,
  LEGACY_BASELINE_PROFILE_ID,
} from '../data/caseStorage';
import {
  calculateCaseTrajectory,
  calculateCaseLiabilityReserve,
  calculateCoSponsorMilestone,
  calculateCaseDerivedOutputs,
  evaluatePortfolioWeights,
} from '../data/quantEngine';
import { CaseProfile } from '../types/caseTypes';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`TEST ASSERTION FAILED: ${msg}`);
  }
}

console.log('Running Wharton Growth Sleeve Case Setup & Validation Test Suite...\n');

// Mock localStorage if in Node environment without window
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => {
      store[key] = val;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
  };
}

// --------------------------------------------------------------------------
// 1. Official Case Profile Creation & Known Facts
// --------------------------------------------------------------------------
const officialBaseline = createOfficialBaselineProfile();
assert(officialBaseline.id === OFFICIAL_BASELINE_PROFILE_ID, 'Official baseline profile ID must match constant');
assert(officialBaseline.isBaseline === true, 'Official baseline must have isBaseline=true');
assert(officialBaseline.facts.initialContribution.value === 300000, 'Initial contribution must be $300,000');
assert(officialBaseline.facts.initialContribution.dateOrYear === 2027, 'Initial contribution year must be 2027');
assert(officialBaseline.facts.additionalContribution.value === 150000, 'Additional contribution must be $150,000');
assert(officialBaseline.facts.additionalContribution.dateOrYear === 2028, 'Additional contribution year must be 2028');
assert(officialBaseline.facts.noWithdrawalsBeforeYear.value === 2033, 'Lockup horizon must be 2033');
assert(officialBaseline.facts.annualOperatingPayment.value === 50000, 'Annual operating payment must be $50,000');
assert(officialBaseline.facts.operatingPaymentCount.value === 10, 'Operating payment count must be 10 payments');
assert(officialBaseline.facts.operatingStartYear.value === 2033, 'Operating start year must be 2033');
assert(officialBaseline.facts.coSponsorCommunicationYear.value === 2031, 'Co-sponsor milestone year must be 2031');
assert(officialBaseline.facts.initialContribution.status === 'VERIFIED', 'Initial contribution status must be VERIFIED');
assert(officialBaseline.facts.contributionTiming.status === 'NEEDS_CONFIRMATION', 'Contribution timing must be NEEDS_CONFIRMATION');
console.log('✓ 1. Official Wharton 2026-27 Case Facts Initial Profile Verified');

// --------------------------------------------------------------------------
// 2. Case-Derived Trajectory Calculations
// --------------------------------------------------------------------------
const trajectory = calculateCaseTrajectory(officialBaseline);
assert(trajectory.length > 0, 'Trajectory schedule must not be empty');
assert(trajectory[0].calendarYear === 2027, 'Trajectory start calendar year must be 2027');
assert(trajectory[0].beginningCapital === 300000, 'Beginning capital in 2027 must be $300,000');
// In 2028, +$150,000 inflow is injected
const year2028 = trajectory.find((t) => t.calendarYear === 2028);
assert(year2028 !== undefined, 'Year 2028 must be in trajectory schedule');
assert(
  year2028!.timingNote.includes('+$150,000'),
  'Year 2028 timing note must document the $150,000 capital inflow injection'
);

// Milestone 2031
const year2031 = trajectory.find((t) => t.calendarYear === 2031);
assert(year2031 !== undefined, 'Year 2031 milestone must exist');
assert(year2031!.timingNote.includes('2031 Milestone'), 'Year 2031 must note co-sponsor communication milestone');

// Ground zero horizon Beginning-2033
const lastStep = trajectory[trajectory.length - 1];
assert(lastStep.calendarYear === 2033, 'Ground Zero target year must be 2033');
assert(lastStep.beginningCapital > 450000, 'Beginning-2033 compounded capital must exceed total contributions of $450,000');
console.log('✓ 2. Multi-Year Dynamic Trajectory Compounding & Milestone Schedule Verified');

// --------------------------------------------------------------------------
// 3. Fiduciary Liability Reserve & Annuity Calculations
// --------------------------------------------------------------------------
const reserveSpec = calculateCaseLiabilityReserve(officialBaseline);
assert(reserveSpec.annualNominalCommitment === 50000, 'Nominal commitment must be $50,000');
assert(reserveSpec.commitmentYears === 10, 'Commitment duration must be 10 years');
assert(reserveSpec.totalNominalLiabilities === 500000, 'Total nominal liabilities must be $500,000');
// PV of 10 payments of $50,000 at 4.5% discount rate:
// Default BEGINNING_OF_YEAR (Annuity due convention):
// 50,000 * (1 - (1.045)^-10) / 0.045 * 1.045 = 413,439.52
assert(
  Math.abs(reserveSpec.reservePVBeginning2033 - 413439.52) < 1.0,
  `Reserve PV (annuity due) at 4.5% must be $413,439.52, got: ${reserveSpec.reservePVBeginning2033}`
);

// Test END_OF_YEAR (Ordinary annuity convention):
// 50,000 * (1 - (1.045)^-10) / 0.045 = 395,636.38
const ordinaryBaseline: CaseProfile = {
  ...officialBaseline,
  assumptions: {
    ...officialBaseline.assumptions,
    timingConvention: 'END_OF_YEAR',
  },
};
const ordinarySpec = calculateCaseLiabilityReserve(ordinaryBaseline);
assert(
  Math.abs(ordinarySpec.reservePVBeginning2033 - 395636.38) < 1.0,
  `Reserve PV (ordinary annuity) at 4.5% must be $395,636.38, got: ${ordinarySpec.reservePVBeginning2033}`
);
assert(
  reserveSpec.beginning2033CapitalBaseline > reserveSpec.reservePVBeginning2033,
  'Baseline capital must cover reserve PV'
);
assert(
  reserveSpec.residualCapitalBaseline ===
    reserveSpec.beginning2033CapitalBaseline - reserveSpec.reservePVBeginning2033,
  'Residual capital for Taiwan residency must equal compounded capital minus reserve PV'
);
console.log('✓ 3. Fiduciary Liability Reserve PV & Annuity Calculations Verified');

// --------------------------------------------------------------------------
// 4. Co-Sponsor 2031 Checkpoint Range Calculation
// --------------------------------------------------------------------------
const coSponsorRange = calculateCoSponsorMilestone(
  officialBaseline,
  trajectory,
  reserveSpec.reservePVBeginning2033
);
assert(coSponsorRange.milestoneYear === 2031, 'Milestone year must be 2031');
assert(coSponsorRange.remainingYearsToGroundZero === 2, 'Remaining years to 2033 must be 2');
assert(
  coSponsorRange.optimisticResidual2033 >= coSponsorRange.baselineResidual2033,
  'Optimistic residual must be >= baseline residual'
);
assert(
  coSponsorRange.baselineResidual2033 >= coSponsorRange.conservativeResidual2033,
  'Baseline residual must be >= conservative residual'
);
assert(coSponsorRange.guidanceText.length > 0, 'Guidance text must be provided for co-sponsors');
console.log('✓ 4. Mandatory 2031 Co-Sponsor Checkpoint Range Modeling Verified');

// --------------------------------------------------------------------------
// 5. Complete Case-Derived Outputs & Coverage Ratio
// --------------------------------------------------------------------------
const derived = calculateCaseDerivedOutputs(officialBaseline);
assert(derived.profileId === OFFICIAL_BASELINE_PROFILE_ID, 'Derived output must link to profile ID');
assert(derived.totalNominalContributions === 450000, 'Total nominal contributions must be $450,000');
assert(derived.totalNominalLiabilities === 500000, 'Total nominal liabilities must be $500,000');
assert(derived.netNominalCashFlow === -50000, 'Net nominal cash flow must be -$50,000');
assert(derived.reserveCoverageRatioBaseline > 1.0, 'Coverage ratio baseline must be > 1.0 (overfunded)');
assert(derived.isFullyCoveredBaseline === true, 'isFullyCoveredBaseline must be true');
console.log('✓ 5. Complete Case-Derived Outputs & Coverage Ratio Invariants Verified');

// --------------------------------------------------------------------------
// 6. Validation Rules & Boundary Cases
// --------------------------------------------------------------------------
// Hard Error: Negative initial contribution
const invalidProfile1: CaseProfile = {
  ...officialBaseline,
  facts: {
    ...officialBaseline.facts,
    initialContribution: {
      ...officialBaseline.facts.initialContribution,
      value: -50000,
    },
  },
};
const res1 = validateCaseProfile(invalidProfile1);
assert(!res1.isValid, 'Negative initial contribution must fail validation');
assert(
  res1.issues.some((i) => i.severity === 'ERROR' && i.fieldId.includes('initialContribution')),
  'Must report ERROR for negative initial contribution'
);

// Hard Error: Reserve discount rate <= 0
const invalidProfile2: CaseProfile = {
  ...officialBaseline,
  assumptions: {
    ...officialBaseline.assumptions,
    reserveDiscountRate: -0.01,
  },
};
const res2 = validateCaseProfile(invalidProfile2);
assert(!res2.isValid, 'Negative discount rate must fail validation');

// Warning: Discount rate > 20%
const warnProfile1: CaseProfile = {
  ...officialBaseline,
  assumptions: {
    ...officialBaseline.assumptions,
    reserveDiscountRate: 0.25,
  },
};
const res3 = validateCaseProfile(warnProfile1);
assert(res3.isValid, 'High discount rate should still be valid as a model assumption');
assert(
  res3.issues.some((i) => i.severity === 'WARNING' && i.fieldId.includes('reserveDiscountRate')),
  'Must issue WARNING for unusually aggressive discount rate'
);

// Hard Error: Payment start year before initial contribution year
const invalidProfile3: CaseProfile = {
  ...officialBaseline,
  facts: {
    ...officialBaseline.facts,
    operatingStartYear: {
      ...officialBaseline.facts.operatingStartYear,
      value: 2025, // before 2027
    },
  },
};
const res4 = validateCaseProfile(invalidProfile3);
assert(!res4.isValid, 'Operating start year prior to contribution start year must fail validation');

// Hard Error: Max position weight > 1.0 or <= 0
const invalidProfile4: CaseProfile = {
  ...officialBaseline,
  policies: {
    ...officialBaseline.policies,
    maxSinglePositionWeight: 1.5,
  },
};
const res5 = validateCaseProfile(invalidProfile4);
assert(!res5.isValid, 'Max position weight > 100% must fail validation');
console.log('✓ 6. Input Validation Rules & Boundary Error Handling Verified');

// --------------------------------------------------------------------------
// 7. Case Profile CRUD & LocalStorage Persistence
// --------------------------------------------------------------------------
// Load default profiles list
const initialProfiles = loadCaseProfiles();
assert(initialProfiles.length >= 2, 'Default profiles must include at least Wharton Baseline and Legacy');
assert(
  initialProfiles.some((p) => p.id === OFFICIAL_BASELINE_PROFILE_ID),
  'Must include official baseline profile'
);

// Create custom profile
const customProfile = createCaseProfile('Alpha Endowment Sleeve', 'Testing custom mandate inputs');
assert(customProfile.id.startsWith('CASE-USER-'), 'New profile must receive CASE-USER- prefix');
assert(customProfile.name === 'Alpha Endowment Sleeve', 'Name must match');
assert(customProfile.version === 1, 'Initial version must be 1');

// Verify it persisted
let currentList = loadCaseProfiles();
assert(currentList.some((p) => p.id === customProfile.id), 'Custom profile must persist in storage');

// Duplicate profile
const duplicated = duplicateCaseProfile(customProfile.id);
assert(duplicated !== null, 'Duplication must succeed');
assert(duplicated!.id !== customProfile.id, 'Duplicated profile must have unique ID');
assert(duplicated!.name.includes('(Copy)'), 'Duplicated profile must have (Copy) in name');

// Rename profile
const renamed = renameCaseProfile(duplicated!.id, 'Renamed Endowment Sleeve');
assert(renamed === true, 'Renaming must succeed');
const updatedList = loadCaseProfiles();
const foundRenamed = updatedList.find((p) => p.id === duplicated!.id);
assert(foundRenamed?.name === 'Renamed Endowment Sleeve', 'Name must be updated');

// Save edits (version bump)
foundRenamed!.assumptions.expectedAnnualReturn = 0.14;
const saveResult = saveCaseProfile(foundRenamed!);
assert(saveResult.success === true, 'Save must succeed');
assert(saveResult.profile!.version === 2, 'Version must increment to 2 upon save');
assert(saveResult.profile!.assumptions.expectedAnnualReturn === 0.14, 'Saved assumption must persist');

// Active profile tracking
setActiveCaseProfileId(customProfile.id);
assert(getActiveCaseProfileId() === customProfile.id, 'Active profile ID must match set value');
const activeObj = getActiveCaseProfile();
assert(activeObj.id === customProfile.id, 'Active profile object must match custom profile');

// Delete custom profile with fallback specification
const tempProfile1 = createCaseProfile('Temporary Sleeve A');
const tempProfile2 = createCaseProfile('Temporary Sleeve B');
setActiveCaseProfileId(tempProfile1.id);
assert(getActiveCaseProfileId() === tempProfile1.id, 'Active ID should be tempProfile1');

// Delete tempProfile1 and specify tempProfile2 as explicit fallback
const deletedWithFallback = deleteCaseProfile(tempProfile1.id, tempProfile2.id);
assert(deletedWithFallback === true, 'Delete with fallback must succeed');
assert(getActiveCaseProfileId() === tempProfile2.id, 'Active ID must switch to specified fallback profile');

// Clean up tempProfile2
deleteCaseProfile(tempProfile2.id);
assert(getActiveCaseProfileId() === OFFICIAL_BASELINE_PROFILE_ID, 'Active ID must revert to baseline');

// Attempting to delete official baseline must be blocked
const baselineDelete = deleteCaseProfile(OFFICIAL_BASELINE_PROFILE_ID);
assert(baselineDelete === false, 'Cannot delete official baseline profile');
console.log('✓ 7. Profile CRUD, Versioning & Storage Persistence Verified');

// --------------------------------------------------------------------------
// 8. JSON Export and Import
// --------------------------------------------------------------------------
// Export official baseline
const jsonExport = exportProfileAsJson(OFFICIAL_BASELINE_PROFILE_ID);
assert(jsonExport !== null, 'Export JSON must not be null');
const parsed = JSON.parse(jsonExport!);
assert(parsed._format === 'growth_sleeve_case_profile_v1', 'Export format header must be present');
assert(parsed.profile.id === OFFICIAL_BASELINE_PROFILE_ID, 'Exported profile ID must match');

// Import valid JSON
const importResult = importProfileFromJson(jsonExport!);
assert(importResult.success === true, 'Importing valid JSON must succeed');
assert(importResult.profile !== undefined, 'Imported profile must be returned');
assert(importResult.profile!.id !== OFFICIAL_BASELINE_PROFILE_ID, 'Imported profile must receive fresh unique ID');
assert(importResult.profile!.name.includes('(Imported)'), 'Imported profile must be tagged');

// Import invalid JSON: missing fields
const invalidImport1 = importProfileFromJson(JSON.stringify({ hello: 'world' }));
assert(invalidImport1.success === false, 'Importing schema with missing fields must fail');
assert(invalidImport1.error !== undefined, 'Error message must be returned');

// Import malformed JSON
const invalidImport2 = importProfileFromJson('Not a JSON string {]');
assert(invalidImport2.success === false, 'Importing malformed JSON must fail');
console.log('✓ 8. JSON Export, Schema Validation & Safe Import Verified');

// --------------------------------------------------------------------------
// 9. Downstream Consumption & Policy Constraints
// --------------------------------------------------------------------------
// Evaluate portfolio with mandate policies:
// 1) Position exceeds max single-position weight (e.g. AAPL @ 50% when policy is 40%)
const holdingsExceedingMax = [
  { symbol: 'AAPL', weight: 0.50 },
  { symbol: 'MSFT', weight: 0.40 },
  { symbol: 'CASH', weight: 0.10 },
];
const evalWithPolicy = evaluatePortfolioWeights(
  holdingsExceedingMax,
  300000,
  0.045,
  undefined,
  officialBaseline.policies
);
assert(evalWithPolicy.isValid, 'Evaluation must be mathematically valid');
assert(
  evalWithPolicy.warnings.some((w) => w.includes('exceeds maximum single-position weight ceiling')),
  'Must issue Mandate Policy Warning when position exceeds maxSinglePositionWeight'
);

// 2) Cash below min cash allocation
const holdingsLowCash = [
  { symbol: 'AAPL', weight: 0.35 },
  { symbol: 'MSFT', weight: 0.35 },
  { symbol: 'NVDA', weight: 0.30 },
];
const evalLowCash = evaluatePortfolioWeights(
  holdingsLowCash,
  300000,
  0.045,
  undefined,
  officialBaseline.policies
);
assert(
  evalLowCash.warnings.some((w) => w.includes('below minimum required buffer')),
  'Must issue Mandate Policy Warning when cash is below minCashAllocation'
);
console.log('✓ 9. Downstream Engine Policy Constraints & Risk Warnings Verified');

console.log('\n======================================================');
console.log('ALL CASE SETUP & MANDATE SYSTEM TESTS PASSED CLEANLY!');
console.log('======================================================\n');
