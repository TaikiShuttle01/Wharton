/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Wharton Global High School Investment Competition - Quantitative Growth Sleeve
 * Persistent Case Setup, Client Mandate & Investment Policy Types
 */

import { LiabilityReserveSpec, TrajectoryYearSchedule } from './quantTypes';

export type FieldVerificationStatus = 'VERIFIED' | 'NEEDS_CONFIRMATION' | 'USER_DEFINED';

export type TimingConvention = 'BEGINNING_OF_YEAR' | 'END_OF_YEAR';

export interface CaseFactField<T = number | string> {
  id: string;
  name: string;
  value: T;
  unit: string;
  dateOrYear?: number | string | null;
  citation: string;
  status: FieldVerificationStatus;
  notes?: string;
  isConfirmedFact: boolean;
}

export interface OfficialCaseFacts {
  competitionName: CaseFactField<string>;
  clientMandateTitle: CaseFactField<string>;
  initialContribution: CaseFactField<number>; // $300,000 in 2027
  additionalContribution: CaseFactField<number>; // $150,000 in 2028
  contributionTiming: CaseFactField<TimingConvention>; // e.g. BEGINNING_OF_YEAR
  noWithdrawalsBeforeYear: CaseFactField<number>; // 2033
  annualOperatingPayment: CaseFactField<number>; // $50,000
  operatingPaymentCount: CaseFactField<number>; // 10 payments
  operatingStartYear: CaseFactField<number>; // 2033
  operatingEndYear: CaseFactField<number>; // 2042
  paymentFundingStandard: CaseFactField<string>; // "Must be funded with high certainty, without outside funding"
  facilityContributionDestination: CaseFactField<string>; // "Taiwan creative residency facility"
  facilityContributionNature: CaseFactField<string>; // "Residual assets after liability reserve; not predetermined"
  coSponsorCommunicationYear: CaseFactField<number>; // 2031: communicate credible range to co-sponsors
}

export interface InvestmentAssumptions {
  expectedAnnualReturn: number; // e.g. 0.2185 (21.85% baseline sleeve return)
  conservativeAnnualReturn: number; // e.g. 0.1000 (10.0% conservative growth)
  optimisticAnnualReturn: number; // e.g. 0.2500 (25.0% optimistic growth)
  reserveDiscountRate: number; // e.g. 0.0450 (4.50% discount rate for liability PV)
  riskFreeRate: number; // e.g. 0.0450 (4.50% for Sharpe/Sortino)
  minimumAcceptableReturn: number; // e.g. 0.0450 (4.50%)
  timingConvention: TimingConvention; // 'BEGINNING_OF_YEAR' vs 'END_OF_YEAR'
  inflationAssumption: number; // e.g. 0.00 (0.0% nominal liabilities per case text)
  transactionCostBps: number; // e.g. 0 (0 bps)
  taxRate: number; // e.g. 0.0 (tax-exempt endowment)
  stressScenarioHaircut: number; // e.g. 0.25 (25% market drawdown buffer)
}

export interface TeamPolicies {
  mandateId: string; // e.g. "WGHSC-GROWTH-SLEEVE"
  maxSinglePositionWeight: number; // e.g. 0.40 (40% max weight)
  maxSinglePositionLimit: number; // alias e.g. 0.40 (40%)
  minCashAllocation: number; // e.g. 0.05 (5% min cash buffer)
  maxCashAllocation: number; // e.g. 0.25 (25% max cash)
  targetCashAllocation: number; // e.g. 0.10 (10% target cash)
  targetGrowthAllocation: number; // e.g. 0.90 (90% growth equity)
  maxSectorConcentrationLimit: number; // e.g. 0.90 (90%)
  minMarketCapThreshold: number; // e.g. 50,000,000,000 ($50B)
  maxDebtToEquityThreshold: number; // e.g. 1.50x
  minOperatingMarginThreshold: number; // e.g. 0.15 (15%)
  minWinsVerificationThreshold: number; // e.g. 0.75 (75% WInS verified data)
  esgNegativeScreening: string; // e.g. "Excludes thermal coal, controversial weapons"
  rebalancingFrequency: 'ANNUAL' | 'SEMI_ANNUAL' | 'QUARTERLY' | 'OPPORTUNISTIC';
  governanceAttestationRequired: boolean;
}

export interface CaseProfile {
  id: string; // Unique profile identifier, e.g. 'CASE-WHARTON-2026-27'
  name: string;
  description: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  isBaseline: boolean; // Indicates if this is the official competition baseline
  isLocked?: boolean;
  facts: OfficialCaseFacts;
  assumptions: InvestmentAssumptions;
  policies: TeamPolicies;
}

export interface CoSponsorMilestoneRange {
  milestoneYear: number; // 2031
  projectedPortfolioAtMilestone: number;
  remainingYearsToGroundZero: number; // 2 years (2031 to 2033)
  conservativeResidual2033: number;
  baselineResidual2033: number;
  optimisticResidual2033: number;
  isUnderfundedConservative: boolean;
  isUnderfundedBaseline: boolean;
  guidanceText: string;
}

export interface CaseDerivedCalculations {
  profileId: string;
  profileVersion: number;
  calculatedAt: string;
  reserveSpec: LiabilityReserveSpec;
  trajectorySchedule: TrajectoryYearSchedule[];
  coSponsorMilestone: CoSponsorMilestoneRange;
  totalNominalContributions: number;
  totalNominalLiabilities: number;
  netNominalCashFlow: number;
  reserveCoverageRatioBaseline: number;
  reserveCoverageRatioStressed: number;
  isFullyCoveredBaseline: boolean;
  isFullyCoveredStressed: boolean;
  warnings: string[];
}

export interface CaseValidationIssue {
  fieldId: string;
  severity: 'ERROR' | 'WARNING';
  message: string;
}

export interface CaseProfileValidationResult {
  isValid: boolean;
  issues: CaseValidationIssue[];
}
