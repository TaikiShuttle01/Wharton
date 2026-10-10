/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Wharton Global High School Investment Competition - Quantitative Growth Sleeve
 * Case Profiles & Client Mandate Storage and Persistence Layer
 */

import {
  CaseProfile,
  OfficialCaseFacts,
  InvestmentAssumptions,
  TeamPolicies,
  CaseProfileValidationResult,
  CaseValidationIssue,
} from '../types/caseTypes';

export const STORAGE_KEY_CASE_PROFILES = 'growth_sleeve_case_profiles_v1';
export const STORAGE_KEY_ACTIVE_PROFILE_ID = 'growth_sleeve_active_case_profile_id_v1';

export const OFFICIAL_BASELINE_PROFILE_ID = 'CASE-WHARTON-2026-27-BASELINE';
export const LEGACY_BASELINE_PROFILE_ID = 'CASE-PHASE12E-LEGACY-BASELINE';

/**
 * Creates the official Wharton 2026-27 Case Facts baseline per competition ground truth.
 */
export function createOfficialCaseFacts(): OfficialCaseFacts {
  return {
    competitionName: {
      id: 'competitionName',
      name: 'Competition Framework',
      value: 'Wharton Global High School Investment Competition (2026–27)',
      unit: 'Text',
      citation: 'Wharton Global Youth Program Case Brief',
      status: 'VERIFIED',
      notes: 'Official high school competition rules and mandate parameters.',
      isConfirmedFact: true,
    },
    clientMandateTitle: {
      id: 'clientMandateTitle',
      name: 'Client Mandate & Sleeve Focus',
      value: 'Long-Horizon Growth Sleeve for Institutional Client',
      unit: 'Text',
      citation: 'Case Mandate Brief Section 1',
      status: 'VERIFIED',
      notes: 'Compounding sleeve dedicated to future operating liabilities and mission expansion.',
      isConfirmedFact: true,
    },
    initialContribution: {
      id: 'initialContribution',
      name: 'Initial Capital Contribution',
      value: 300000,
      unit: 'USD',
      dateOrYear: 2027,
      citation: 'Wharton Case Brief §2.1: Client Inflows',
      status: 'VERIFIED',
      notes: '$300,000 initial capital deployed in 2027.',
      isConfirmedFact: true,
    },
    additionalContribution: {
      id: 'additionalContribution',
      name: 'Additional Capital Contribution',
      value: 150000,
      unit: 'USD',
      dateOrYear: 2028,
      citation: 'Wharton Case Brief §2.1: Subsequent Capital Inflow',
      status: 'VERIFIED',
      notes: 'Additional $150,000 injected in 2028 ($450,000 cumulative client capital).',
      isConfirmedFact: true,
    },
    contributionTiming: {
      id: 'contributionTiming',
      name: 'Contribution Cash-Flow Timing',
      value: 'BEGINNING_OF_YEAR',
      unit: 'Convention',
      citation: 'Wharton Financial Modeling Guidelines (Standard Assumption)',
      status: 'NEEDS_CONFIRMATION',
      notes: 'Assumed deployed at beginning of respective calendar years (2027 & 2028). Requires case committee confirmation.',
      isConfirmedFact: false,
    },
    noWithdrawalsBeforeYear: {
      id: 'noWithdrawalsBeforeYear',
      name: 'Withdrawal Lockup Horizon',
      value: 2033,
      unit: 'Year',
      dateOrYear: 2033,
      citation: 'Wharton Case Brief §2.3: Capital Preservation',
      status: 'VERIFIED',
      notes: 'Strict long-horizon lockup: No capital withdrawals permitted prior to calendar year 2033.',
      isConfirmedFact: true,
    },
    annualOperatingPayment: {
      id: 'annualOperatingPayment',
      name: 'Annual Operating Payment Amount',
      value: 50000,
      unit: 'USD / Year',
      dateOrYear: '2033–2042',
      citation: 'Wharton Case Brief §3.2: Operating Obligations',
      status: 'VERIFIED',
      notes: '$50,000 annual nominal payment obligation.',
      isConfirmedFact: true,
    },
    operatingPaymentCount: {
      id: 'operatingPaymentCount',
      name: 'Operating Payment Duration',
      value: 10,
      unit: 'Annual Payments',
      dateOrYear: '10 Years',
      citation: 'Wharton Case Brief §3.2: 10-Year Schedule',
      status: 'VERIFIED',
      notes: 'Ten consecutive annual commitments starting in 2033 ($500,000 total nominal liabilities).',
      isConfirmedFact: true,
    },
    operatingStartYear: {
      id: 'operatingStartYear',
      name: 'Operating Schedule Start Year',
      value: 2033,
      unit: 'Year',
      dateOrYear: 2033,
      citation: 'Wharton Case Brief §3.1: Ground Zero Target',
      status: 'VERIFIED',
      notes: 'Beginning of 2033 marks the start of the 10-year operating liability window.',
      isConfirmedFact: true,
    },
    operatingEndYear: {
      id: 'operatingEndYear',
      name: 'Operating Schedule End Year',
      value: 2042,
      unit: 'Year',
      dateOrYear: 2042,
      citation: 'Wharton Case Brief §3.2: Final Liability Commitment',
      status: 'VERIFIED',
      notes: 'Ten payments complete in 2042.',
      isConfirmedFact: true,
    },
    paymentFundingStandard: {
      id: 'paymentFundingStandard',
      name: 'Funding Certainty Standard',
      value: 'High degree of certainty; zero reliance on outside funding',
      unit: 'Fiduciary Rule',
      citation: 'Wharton Case Brief §4.1: Immunization Mandate',
      status: 'VERIFIED',
      notes: 'Operating payments must be immunized internally from portfolio reserves without secondary donor calls.',
      isConfirmedFact: true,
    },
    facilityContributionDestination: {
      id: 'facilityContributionDestination',
      name: 'Residual Facility Destination',
      value: 'Taiwan creative residency facility',
      unit: 'Mission Entity',
      citation: 'Wharton Case Brief §4.3: Mission Expansion',
      status: 'VERIFIED',
      notes: 'Client intended beneficiary for surplus growth sleeve residual capital.',
      isConfirmedFact: true,
    },
    facilityContributionNature: {
      id: 'facilityContributionNature',
      name: 'Facility Contribution Determination',
      value: 'Not predetermined; funded exclusively from residual assets',
      unit: 'Discretionary Surplus',
      citation: 'Wharton Case Brief §4.3: Residual Capital Clause',
      status: 'VERIFIED',
      notes: 'Not a mandatory liability; strictly subordinate to the $500,000 liability reserve immunization.',
      isConfirmedFact: true,
    },
    coSponsorCommunicationYear: {
      id: 'coSponsorCommunicationYear',
      name: 'Co-Sponsor Milestone Year',
      value: 2031,
      unit: 'Year',
      dateOrYear: 2031,
      citation: 'Wharton Case Brief §5.1: Co-Sponsor Communication Requirement',
      status: 'VERIFIED',
      notes: 'In 2031, the committee must communicate a credible estimated range for potential 2033 facility contribution to co-sponsors.',
      isConfirmedFact: true,
    },
  };
}

/**
 * Creates default editable investment assumptions.
 */
export function createDefaultAssumptions(): InvestmentAssumptions {
  return {
    expectedAnnualReturn: 0.2185, // 21.85% active sleeve CAGR
    conservativeAnnualReturn: 0.1000, // 10.0% conservative growth projection
    optimisticAnnualReturn: 0.2500, // 25.0% optimistic growth projection
    reserveDiscountRate: 0.0450, // 4.50% risk-free discount rate
    riskFreeRate: 0.0450, // 4.50% risk-free rate for Sharpe
    minimumAcceptableReturn: 0.0450, // 4.50% hurdle rate
    timingConvention: 'BEGINNING_OF_YEAR', // Annuity due convention for beginning-of-year commitments
    inflationAssumption: 0.0000, // 0.0% nominal liabilities
    transactionCostBps: 0.0, // 0 bps
    taxRate: 0.0, // Tax-exempt
    stressScenarioHaircut: 0.2500, // 25.0% severe stress haircut
  };
}

/**
 * Creates default team policy settings.
 */
export function createDefaultPolicies(): TeamPolicies {
  return {
    mandateId: 'WGHSC-GROWTH-SLEEVE',
    maxSinglePositionWeight: 0.40, // 40%
    maxSinglePositionLimit: 0.40, // 40%
    minCashAllocation: 0.05, // 5%
    maxCashAllocation: 0.25, // 25%
    targetCashAllocation: 0.10, // 10%
    targetGrowthAllocation: 0.90, // 90%
    maxSectorConcentrationLimit: 0.90, // 90%
    minMarketCapThreshold: 50000000000, // $50B
    maxDebtToEquityThreshold: 1.50, // 1.50x
    minOperatingMarginThreshold: 0.15, // 15.0%
    minWinsVerificationThreshold: 0.75, // 75%
    esgNegativeScreening: 'Excludes thermal coal, controversial weapons, and direct sanctions violations',
    rebalancingFrequency: 'ANNUAL',
    governanceAttestationRequired: true,
  };
}

/**
 * Creates the official Wharton 2026–27 Case Profile baseline.
 */
export function createOfficialBaselineProfile(): CaseProfile {
  return {
    id: OFFICIAL_BASELINE_PROFILE_ID,
    name: 'Wharton 2026–27 Official Case Baseline',
    description:
      'Official Wharton Global High School Investment Competition mandate: $300k in 2027, $150k in 2028, 10 annual $50k operating payments (2033–2042), and 2031 co-sponsor facility range.',
    version: 1,
    createdAt: '2026-10-09T00:00:00.000Z',
    updatedAt: '2026-10-09T00:00:00.000Z',
    isBaseline: true,
    isLocked: false,
    facts: createOfficialCaseFacts(),
    assumptions: createDefaultAssumptions(),
    policies: createDefaultPolicies(),
  };
}

/**
 * Creates the legacy Phase 12E Baseline Profile for backward compatibility.
 */
export function createLegacyBaselineProfile(): CaseProfile {
  const facts = createOfficialCaseFacts();
  facts.initialContribution.value = 100000;
  facts.initialContribution.dateOrYear = 2023;
  facts.additionalContribution.value = 0;
  facts.additionalContribution.dateOrYear = null;
  facts.annualOperatingPayment.value = 10000;
  facts.operatingPaymentCount.value = 5;
  facts.operatingEndYear.value = 2037;
  facts.competitionName.notes = 'Archived Phase 12E model specification ($100k principal, 5x $10k commitments).';

  return {
    id: LEGACY_BASELINE_PROFILE_ID,
    name: 'Phase 12E Legacy Baseline ($100k / 5-Yr Archive)',
    description:
      'Historical model baseline: $100k initial capital in 2023 compounding to Beg-2033 to fund five $10,000 annual commitments ($50,000 nominal). Preserved for comparative audit.',
    version: 1,
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-05T00:00:00.000Z',
    isBaseline: false,
    isLocked: false,
    facts,
    assumptions: createDefaultAssumptions(),
    policies: createDefaultPolicies(),
  };
}

/**
 * Validates a case profile against mathematical and mandate integrity rules.
 */
export function validateCaseProfile(profile: CaseProfile): CaseProfileValidationResult {
  const issues: CaseValidationIssue[] = [];

  // Facts validation
  if (profile.facts.initialContribution.value <= 0) {
    issues.push({
      fieldId: 'initialContribution',
      severity: 'ERROR',
      message: 'Initial contribution must be greater than zero.',
    });
  }

  if (profile.facts.additionalContribution.value < 0) {
    issues.push({
      fieldId: 'additionalContribution',
      severity: 'ERROR',
      message: 'Additional contribution cannot be negative.',
    });
  }

  if (profile.facts.annualOperatingPayment.value <= 0) {
    issues.push({
      fieldId: 'annualOperatingPayment',
      severity: 'ERROR',
      message: 'Annual operating payment must be greater than zero.',
    });
  }

  if (profile.facts.operatingPaymentCount.value <= 0 || !Number.isInteger(profile.facts.operatingPaymentCount.value)) {
    issues.push({
      fieldId: 'operatingPaymentCount',
      severity: 'ERROR',
      message: 'Payment count must be a positive integer (e.g. 10 payments).',
    });
  }

  if (profile.facts.operatingStartYear.value < 2027) {
    issues.push({
      fieldId: 'operatingStartYear',
      severity: 'ERROR',
      message: 'Operating schedule start year cannot precede initial contribution year (2027).',
    });
  }

  if (profile.facts.operatingEndYear.value < profile.facts.operatingStartYear.value) {
    issues.push({
      fieldId: 'operatingEndYear',
      severity: 'ERROR',
      message: 'Operating end year must be after start year.',
    });
  }

  if (profile.facts.coSponsorCommunicationYear.value >= profile.facts.operatingStartYear.value) {
    issues.push({
      fieldId: 'coSponsorCommunicationYear',
      severity: 'WARNING',
      message: 'Co-sponsor communication milestone (2031) should precede operating start year (2033).',
    });
  }

  // Assumptions validation
  if (profile.assumptions.reserveDiscountRate <= 0) {
    issues.push({
      fieldId: 'reserveDiscountRate',
      severity: 'ERROR',
      message: 'Reserve discount rate must be greater than 0% (e.g. 0.045 for 4.5%).',
    });
  } else if (profile.assumptions.reserveDiscountRate > 0.20) {
    issues.push({
      fieldId: 'reserveDiscountRate',
      severity: 'WARNING',
      message: 'Reserve discount rate exceeds 20.0%, which is unusually aggressive for fiduciary liability immunization.',
    });
  }

  if (profile.assumptions.expectedAnnualReturn < -0.20 || profile.assumptions.expectedAnnualReturn > 1.0) {
    issues.push({
      fieldId: 'expectedAnnualReturn',
      severity: 'ERROR',
      message: 'Expected return must be a reasonable annual rate between -20% and 100%.',
    });
  }

  if (profile.assumptions.conservativeAnnualReturn > profile.assumptions.expectedAnnualReturn) {
    issues.push({
      fieldId: 'conservativeAnnualReturn',
      severity: 'WARNING',
      message: 'Conservative return scenario is typically lower than baseline expected return.',
    });
  }

  // Policies validation
  if (profile.policies.targetCashAllocation < 0 || profile.policies.targetCashAllocation > 0.50) {
    issues.push({
      fieldId: 'targetCashAllocation',
      severity: 'ERROR',
      message: 'Target cash allocation must be between 0% and 50%.',
    });
  }

  const maxPos = profile.policies.maxSinglePositionWeight ?? profile.policies.maxSinglePositionLimit;
  if (maxPos <= 0 || maxPos > 1.0) {
    issues.push({
      fieldId: 'maxSinglePositionWeight',
      severity: 'ERROR',
      message: 'Maximum single-position limit must be between 1% and 100%.',
    });
  }

  return {
    isValid: issues.filter((i) => i.severity === 'ERROR').length === 0,
    issues,
  };
}

/**
 * Loads all saved case profiles from localStorage.
 * If none exist, seeds with Official Baseline and Legacy Baseline.
 */
export function loadCaseProfiles(): CaseProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CASE_PROFILES);
    if (!raw) {
      const initial = [createOfficialBaselineProfile(), createLegacyBaselineProfile()];
      saveCaseProfiles(initial);
      return initial;
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure the official baseline is present
      const hasOfficial = parsed.some((p) => p.id === OFFICIAL_BASELINE_PROFILE_ID);
      if (!hasOfficial) {
        parsed.unshift(createOfficialBaselineProfile());
        saveCaseProfiles(parsed);
      }
      return parsed;
    }

    const fallback = [createOfficialBaselineProfile(), createLegacyBaselineProfile()];
    saveCaseProfiles(fallback);
    return fallback;
  } catch (err) {
    console.warn('Failed to load case profiles from storage; using defaults', err);
    return [createOfficialBaselineProfile(), createLegacyBaselineProfile()];
  }
}

/**
 * Saves case profiles array to localStorage.
 */
export function saveCaseProfiles(profiles: CaseProfile[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY_CASE_PROFILES, JSON.stringify(profiles));
    return true;
  } catch (err) {
    console.error('Failed to save case profiles to localStorage', err);
    return false;
  }
}

/**
 * Gets the active case profile ID from localStorage.
 * Defaults to OFFICIAL_BASELINE_PROFILE_ID.
 */
export function getActiveCaseProfileId(): string {
  try {
    const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_PROFILE_ID);
    if (activeId) return activeId;
    localStorage.setItem(STORAGE_KEY_ACTIVE_PROFILE_ID, OFFICIAL_BASELINE_PROFILE_ID);
    return OFFICIAL_BASELINE_PROFILE_ID;
  } catch (err) {
    return OFFICIAL_BASELINE_PROFILE_ID;
  }
}

/**
 * Sets the active case profile ID in localStorage.
 */
export function setActiveCaseProfileId(profileId: string): boolean {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_PROFILE_ID, profileId);
    return true;
  } catch (err) {
    console.error('Failed to set active case profile ID', err);
    return false;
  }
}

/**
 * Gets the currently active CaseProfile object.
 */
export function getActiveCaseProfile(): CaseProfile {
  const profiles = loadCaseProfiles();
  const activeId = getActiveCaseProfileId();
  const active = profiles.find((p) => p.id === activeId);
  if (active) return active;

  // Fallback to official baseline
  const official = profiles.find((p) => p.id === OFFICIAL_BASELINE_PROFILE_ID) || profiles[0] || createOfficialBaselineProfile();
  setActiveCaseProfileId(official.id);
  return official;
}

/**
 * Saves edits to an existing profile or inserts a new one.
 * Increments the version number upon successful save.
 */
export function saveCaseProfile(profile: CaseProfile): { success: boolean; profile?: CaseProfile; error?: string } {
  const validation = validateCaseProfile(profile);
  if (!validation.isValid) {
    const errorMsg = validation.issues.filter((i) => i.severity === 'ERROR').map((i) => i.message).join(' ');
    return { success: false, error: `Validation failed: ${errorMsg}` };
  }

  const profiles = loadCaseProfiles();
  const index = profiles.findIndex((p) => p.id === profile.id);

  const updatedProfile: CaseProfile = {
    ...profile,
    version: profile.version + 1,
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    profiles[index] = updatedProfile;
  } else {
    profiles.push(updatedProfile);
  }

  const ok = saveCaseProfiles(profiles);
  return { success: ok, profile: updatedProfile, error: ok ? undefined : 'Storage write error.' };
}

/**
 * Duplicates a profile with a fresh unique ID and independent history.
 */
export function duplicateCaseProfile(profileId: string): CaseProfile | null {
  const profiles = loadCaseProfiles();
  const target = profiles.find((p) => p.id === profileId);
  if (!target) return null;

  const newId = `CASE-USER-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const duplicated: CaseProfile = {
    ...JSON.parse(JSON.stringify(target)),
    id: newId,
    name: `${target.name} (Copy)`,
    description: `Duplicated from ${target.name} on ${new Date().toLocaleDateString()}.`,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isBaseline: false,
    isLocked: false,
  };

  profiles.push(duplicated);
  saveCaseProfiles(profiles);
  return duplicated;
}

/**
 * Creates a brand new custom case profile.
 */
export function createCaseProfile(name: string, description?: string): CaseProfile {
  const profiles = loadCaseProfiles();
  const newId = `CASE-USER-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const newProfile: CaseProfile = {
    id: newId,
    name: name.trim() || 'Custom Investment Mandate',
    description: description || 'User-defined client mandate and liability schedule.',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isBaseline: false,
    isLocked: false,
    facts: createOfficialCaseFacts(),
    assumptions: createDefaultAssumptions(),
    policies: createDefaultPolicies(),
  };

  profiles.push(newProfile);
  saveCaseProfiles(profiles);
  return newProfile;
}

/**
 * Renames an existing profile without mutating its financial inputs.
 */
export function renameCaseProfile(profileId: string, newName: string): boolean {
  if (!newName.trim()) return false;
  const profiles = loadCaseProfiles();
  const target = profiles.find((p) => p.id === profileId);
  if (!target) return false;

  target.name = newName.trim();
  target.updatedAt = new Date().toISOString();
  return saveCaseProfiles(profiles);
}

/**
 * Restores the Official Baseline Profile to pure verified defaults
 * without deleting other user-created profiles.
 */
export function restoreBaselineCaseProfile(): CaseProfile {
  const profiles = loadCaseProfiles();
  const pristine = createOfficialBaselineProfile();

  const idx = profiles.findIndex((p) => p.id === OFFICIAL_BASELINE_PROFILE_ID);
  if (idx >= 0) {
    profiles[idx] = pristine;
  } else {
    profiles.unshift(pristine);
  }

  saveCaseProfiles(profiles);
  return pristine;
}

/**
 * Deletes a user profile (cannot delete the official baseline profile).
 * If deleting the currently active profile, safely switches to fallbackProfileId or official baseline.
 */
export function deleteCaseProfile(profileId: string, fallbackProfileId?: string): boolean {
  if (profileId === OFFICIAL_BASELINE_PROFILE_ID) {
    console.warn('Cannot delete the official verified baseline profile.');
    return false;
  }

  const profiles = loadCaseProfiles();
  const updated = profiles.filter((p) => p.id !== profileId);
  if (updated.length === 0) {
    updated.push(createOfficialBaselineProfile());
  }

  saveCaseProfiles(updated);

  // If the deleted profile was active, switch to fallback or baseline
  const activeId = getActiveCaseProfileId();
  if (activeId === profileId) {
    let targetFallback = OFFICIAL_BASELINE_PROFILE_ID;
    if (fallbackProfileId && updated.some((p) => p.id === fallbackProfileId)) {
      targetFallback = fallbackProfileId;
    } else {
      const foundBaseline = updated.find((p) => p.id === OFFICIAL_BASELINE_PROFILE_ID);
      targetFallback = foundBaseline ? foundBaseline.id : updated[0].id;
    }
    setActiveCaseProfileId(targetFallback);
  }

  return true;
}

/**
 * Exports a profile to JSON format.
 */
export function exportProfileAsJson(profileId: string): string | null {
  const profiles = loadCaseProfiles();
  const profile = profiles.find((p) => p.id === profileId);
  if (!profile) return null;

  return JSON.stringify(
    {
      _format: 'growth_sleeve_case_profile_v1',
      exportedAt: new Date().toISOString(),
      profile,
    },
    null,
    2
  );
}

/**
 * Imports a profile from JSON string with strict schema validation.
 */
export function importProfileFromJson(jsonStr: string): { success: boolean; profile?: CaseProfile; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    const candidate = parsed.profile || parsed;

    if (!candidate || !candidate.id || !candidate.facts || !candidate.assumptions || !candidate.policies) {
      return { success: false, error: 'Invalid JSON schema: Missing required case profile structure.' };
    }

    // Assign fresh ID to avoid colliding with official baseline or existing profiles
    const importedId = `CASE-IMPORTED-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const imported: CaseProfile = {
      ...candidate,
      id: importedId,
      name: `${candidate.name || 'Imported Case'} (Imported)`,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isBaseline: false,
      isLocked: false,
    };

    const validation = validateCaseProfile(imported);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Import validation failed: ${validation.issues.map((i) => i.message).join(' ')}`,
      };
    }

    const profiles = loadCaseProfiles();
    profiles.push(imported);
    saveCaseProfiles(profiles);

    return { success: true, profile: imported };
  } catch (err) {
    return { success: false, error: 'Malformed JSON input: Unable to parse document.' };
  }
}
