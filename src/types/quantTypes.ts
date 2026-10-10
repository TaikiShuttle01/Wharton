/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Wharton Global High School Investment Competition - Quantitative Growth Sleeve
 * Phase 12E Clean Data Contracts
 */

export type DataCategory =
  | 'CASE_FACT'
  | 'MODEL_ASSUMPTION'
  | 'DATA'
  | 'MODEL_OUTPUT'
  | 'HUMAN_DECISION';

export type DataState =
  | 'READY'
  | 'PARTIAL'
  | 'MISSING'
  | 'INVALID'
  | 'UNRESOLVED'
  | 'UNVERIFIED'
  | 'VERIFIED'
  | 'UNAVAILABLE'
  | 'BLOCKED'
  | 'NOT_PROVIDED'
  | 'NOT_COMPUTED'
  | 'NOT_STRESSED';

export type FundamentalClassification =
  | 'DIRECT'        // SEC EDGAR XBRL 10-K / 10-Q filing
  | 'DERIVED'       // Vendor-calculated financial ratio
  | 'NOT_PROVIDED'  // Missing from source
  | 'UNRESOLVED';   // Conflicting values without resolution rule

export type ResolutionRule =
  | 'PRIMARY_PROVIDER_PRECEDENCE'
  | 'SEC_FILING_GROUND_TRUTH'
  | 'NONE_UNRESOLVED';

export interface MetricDisagreement {
  metricKey: string;
  metricLabel: string;
  providerValues: {
    provider: string;
    value: number;
    source: string;
  }[];
  selectedModelValue: number;
  selectionRule: ResolutionRule;
  isUnresolved: boolean;
  deltaPercent: number;
  explanation: string;
}

export interface SecurityFundamental {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  classification: FundamentalClassification;
  provider: string;
  period: string;
  disagreement?: MetricDisagreement;
}

export interface MonthlyPricePoint {
  date: string;
  close: number;
  adjustedClose: number;
  volume: number;
  provider: string;
}

export interface SecurityMetrics {
  annualizedReturn: number;
  annualizedVolatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  betaSPY: number;
  var95: number;
  upCapture: number;
  downCapture: number;
}

export interface ScreeningResult {
  ruleId: string;
  name: string;
  category: 'Scale' | 'Solvency' | 'Growth' | 'Profitability' | 'Compliance';
  operator: '>=' | '<=' | '==';
  thresholdValue: number | string;
  thresholdLabel: string;
  actualValue: number | string;
  actualLabel: string;
  passed: boolean;
  commentary: string;
}

export interface SecurityRecord {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  assetType: 'Equity' | 'Benchmark';
  exchange: string;
  currency: 'USD';
  currentPrice: number;
  priceDate: string;
  dataReadiness: DataState;
  fundamentals: SecurityFundamental[];
  metrics: SecurityMetrics;
  priceHistory: MonthlyPricePoint[];
  screeningResults: ScreeningResult[];
  overallScreeningPass: boolean;
  disagreements: MetricDisagreement[];
  provenance: {
    primaryProvider: string;
    secCik?: string;
    lastIngestionTimestamp: string;
    rawPayloadHash: string;
  };
}

export interface PortfolioHolding {
  symbol: string;
  name: string;
  weight: number;
  price: number;
  sector: string;
  currentValue: number;
}

export interface PortfolioMetrics {
  totalCapital: number;
  cashAllocation: number;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  betaSPY: number;
  var95Monthly: number;
  topHoldingsConcentration: number;
  herfindahlIndex: number;
  sectorBreakdown: { [sector: string]: number };
}

export interface MarginalFitDelta {
  proposedSymbol: string;
  targetWeight: number;
  metrics: {
    expectedReturn: { current: number; proposed: number; delta: number };
    volatility: { current: number; proposed: number; delta: number };
    sharpeRatio: { current: number; proposed: number; delta: number };
    sortinoRatio: { current: number; proposed: number; delta: number };
    betaSPY: { current: number; proposed: number; delta: number };
    var95Monthly: { current: number; proposed: number; delta: number };
    maxDrawdown: { current: number; proposed: number; delta: number };
    topHoldingsConcentration: { current: number; proposed: number; delta: number };
  };
  sectorShift: {
    sector: string;
    currentWeight: number;
    proposedWeight: number;
    delta: number;
  }[];
  correlationToPortfolio: number;
  diversificationEffect: string;
}

export interface ConstructionProposal {
  id: string;
  name: string;
  methodology: string;
  rationale: string;
  holdings: { symbol: string; weight: number }[];
  metrics: PortfolioMetrics;
  validationStatus: 'FULLY_VALIDATED' | 'CONDITIONAL_VALIDATION' | 'FAILED_VALIDATION';
  warnings: string[];
  limitations: string[];
}

export interface DeterministicStressScenario {
  id: string;
  name: string;
  category: 'Broad Absolute Shock' | 'Severe Broad Absolute Shock' | 'Beta Market Shock' | 'Sector Shock' | 'Security Shock';
  description: string;
  historicalPrecedent?: string;
  portfolioImpactPercent: number;
  portfolioImpactDollar: number;
  securityImpacts: {
    symbol: string;
    lossPercent: number;
    dollarImpact: number;
    postShockWeight: number;
  }[];
}

export interface TrajectoryYearSchedule {
  year: number;
  calendarYear: number;
  beginningCapital: number;
  grossReturn: number;
  endingPortfolioValue: number;
  timingNote: string;
}

export interface LiabilityReserveSpec {
  initialCapital: number;
  beginning2033CapitalBaseline: number;
  beginning2033CapitalStressed: number;
  discountRateAssumption: number;
  annualNominalCommitment: number;
  commitmentYears: number;
  totalNominalLiabilities: number;
  reservePVBeginning2033: number;
  residualCapitalBaseline: number;
  residualCapitalStressed: number;
}

export interface CIODecisionRecord {
  mandateId: string;
  reviewStatus: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'CONDITIONAL_APPROVAL';
  selectedProposalId: string;
  analystSignoff: string;
  cioSignoff: string;
  decisionDate: string;
  checklist: {
    item: string;
    status: 'COMPLIANT' | 'BREACH' | 'NOT_APPLICABLE';
    source: string;
  }[];
  qualitativeThesisNotes: string;
}

export interface RequestLedgerEntry {
  requestId: string;
  timestamp: string;
  provider: string;
  endpoint: string;
  symbol: string;
  statusCode: number;
  cacheHit: boolean;
  payloadHash: string;
  latencyMs: number;
}
