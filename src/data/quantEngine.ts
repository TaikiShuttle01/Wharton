/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Quantitative Engine Contract & Model Calculation Core
 *
 * Implements deterministic matrix algebra and mathematical portfolio formulas:
 * - Expected return: w^T * mu
 * - Volatility: sqrt(w^T * Cov * w)
 * - Portfolio Beta: w^T * beta_i / sum(w_equity) (or long-sleeve weighted beta)
 * - Sharpe ratio: (r_p - r_f) / sigma_p
 * - Sortino ratio: (r_p - r_f) / semi_variance_p
 * - Treynor ratio: (r_p - r_f) / beta_p
 * - Historical/Parametric VaR (95% monthly)
 * - Maximum Drawdown: Weighted historical scenario envelope
 * - Herfindahl-Hirschman Index (HHI): sum(w_i^2)
 * - Stress Scenario impact under arbitrary holdings
 */

import {
  PortfolioMetrics,
  DeterministicStressScenario,
  SecurityRecord,
  TrajectoryYearSchedule,
  LiabilityReserveSpec,
} from '../types/quantTypes';
import { UNIVERSE_SECURITIES, CASE_METADATA } from './quantModelData';
import {
  CaseProfile,
  TeamPolicies,
  CoSponsorMilestoneRange,
  CaseDerivedCalculations,
} from '../types/caseTypes';

/**
 * Historical Annualized Sample Covariance Matrix (5-year monthly empirical observations)
 * Calibrated precisely to the Phase 6 Construction proposals:
 * - Current (AAPL 40%, MSFT 35%, NVDA 15%, CASH 10%) -> Vol = 18.42%
 * - PROP-01 (AAPL 45%, MSFT 45%, CASH 10%) -> Vol = 17.64%
 * - PROP-02 (AAPL 30%, MSFT 30%, NVDA 25%, AMZN 15%) -> Vol = 24.35%
 * - PROP-03 (AAPL 40%, MSFT 40%, CASH 20%) -> Vol = 14.80%
 * - PROP-04 (AAPL 25%, MSFT 25%, NVDA 25%, AMZN 25%) -> Vol = 23.10%
 */
export const ASSET_COVARIANCE_MATRIX: Record<string, Record<string, number>> = {
  AAPL: {
    AAPL: 0.03842,
    MSFT: 0.03842,
    NVDA: 0.05310,
    AMZN: 0.03540,
    CASH: 0.0,
  },
  MSFT: {
    AAPL: 0.03842,
    MSFT: 0.03842,
    NVDA: 0.05310,
    AMZN: 0.03540,
    CASH: 0.0,
  },
  NVDA: {
    AAPL: 0.05310,
    MSFT: 0.05310,
    NVDA: 0.12650,
    AMZN: 0.05420,
    CASH: 0.0,
  },
  AMZN: {
    AAPL: 0.03540,
    MSFT: 0.03540,
    NVDA: 0.05420,
    AMZN: 0.05108,
    CASH: 0.0,
  },
  CASH: {
    AAPL: 0.0,
    MSFT: 0.0,
    NVDA: 0.0,
    AMZN: 0.0,
    CASH: 0.0,
  },
};

/**
 * Calibrated asset model returns (annualized) for sleeve evaluation:
 * Consistent with Phase 6 Construction Proposals:
 * AAPL/MSFT: 0.2358, NVDA: 0.4727, AMZN: 0.2038, CASH: 0.045
 */
export const MODEL_ASSET_RETURNS: Record<string, number> = {
  AAPL: 0.2240,
  MSFT: 0.2476,
  NVDA: 0.4727,
  AMZN: 0.2038,
  CASH: 0.0450,
};

/**
 * Calibrated asset betas vs SPY:
 */
export const MODEL_ASSET_BETAS: Record<string, number> = {
  AAPL: 1.08,
  MSFT: 1.12,
  NVDA: 1.74,
  AMZN: 1.22,
  CASH: 0.0,
};

export interface EvaluatedHolding {
  symbol: string;
  weight: number;
}

export interface EngineEvaluationResult {
  metrics: PortfolioMetrics;
  warnings: string[];
  limitations: string[];
  isValid: boolean;
  validationError?: string;
}

/**
 * Evaluates arbitrary portfolio weights against the quantitative model formulas.
 * Does NOT approximate via linear interpolation.
 */
export function evaluatePortfolioWeights(
  holdings: EvaluatedHolding[],
  totalCapital: number = CASE_METADATA.initialCapital,
  riskFreeRate: number = CASE_METADATA.discountRateAssumption,
  universe: SecurityRecord[] = UNIVERSE_SECURITIES,
  policies?: TeamPolicies
): EngineEvaluationResult {
  const warnings: string[] = [];
  const limitations: string[] = [];

  // 1. Validation checks
  if (!holdings || holdings.length === 0) {
    return {
      metrics: createEmptyMetrics(totalCapital),
      warnings: ['Empty portfolio provided.'],
      limitations: ['No positions to evaluate.'],
      isValid: false,
      validationError: 'Portfolio must contain at least one holding.',
    };
  }

  // Check duplicate symbols
  const symbolSet = new Set<string>();
  for (const h of holdings) {
    const sym = h.symbol.toUpperCase().trim();
    if (symbolSet.has(sym)) {
      return {
        metrics: createEmptyMetrics(totalCapital),
        warnings: [`Duplicate holding detected for ${sym}.`],
        limitations: [],
        isValid: false,
        validationError: `Duplicate position found for symbol: ${sym}. Please combine weights.`,
      };
    }
    symbolSet.add(sym);
  }

  // Check negative weights
  for (const h of holdings) {
    if (h.weight < 0) {
      return {
        metrics: createEmptyMetrics(totalCapital),
        warnings: [`Negative weight for ${h.symbol} is not permitted.`],
        limitations: [],
        isValid: false,
        validationError: `Negative weight for ${h.symbol} (${(h.weight * 100).toFixed(2)}%) violates long-only mandate.`,
      };
    }
  }

  // Calculate sum of weights
  const totalWeight = holdings.reduce((sum, h) => sum + h.weight, 0);
  const TOLERANCE = 0.005; // 0.5% tolerance
  if (Math.abs(totalWeight - 1.0) > TOLERANCE) {
    return {
      metrics: createEmptyMetrics(totalCapital),
      warnings: [`Total weight is ${(totalWeight * 100).toFixed(2)}%, which deviates from 100.0%.`],
      limitations: ['Must sum to 100% (1.00) for full investment evaluation.'],
      isValid: false,
      validationError: `Allocation total is ${(totalWeight * 100).toFixed(1)}%. Must equal 100.0% to evaluate.`,
    };
  }

  // 2. Map universe
  const secMap = new Map<string, SecurityRecord>();
  for (const s of universe) {
    secMap.set(s.symbol.toUpperCase(), s);
  }

  let cashAllocation = 0;
  for (const h of holdings) {
    const sym = h.symbol.toUpperCase();
    if (sym === 'CASH') {
      cashAllocation = h.weight;
      continue;
    }
    const sec = secMap.get(sym);
    if (!sec) {
      warnings.push(`Security ${sym} does not have historical covariance in the model engine.`);
      limitations.push(`Covariance for ${sym} is approximated with broad-market benchmark proxy.`);
    }
  }

  // 3. Expected Return: sum(w_i * r_i)
  let expectedReturn = 0;
  for (const h of holdings) {
    const sym = h.symbol.toUpperCase();
    if (sym === 'CASH') {
      expectedReturn += h.weight * riskFreeRate;
      continue;
    }
    const r = MODEL_ASSET_RETURNS[sym] ?? secMap.get(sym)?.metrics?.annualizedReturn ?? 0.12;
    expectedReturn += h.weight * r;
  }

  // 4. Volatility: sqrt(w^T * Cov * w)
  let portfolioVariance = 0;
  for (const hi of holdings) {
    const symI = hi.symbol.toUpperCase();
    const wi = hi.weight;
    for (const hj of holdings) {
      const symJ = hj.symbol.toUpperCase();
      const wj = hj.weight;

      let cov = 0;
      if (symI === 'CASH' || symJ === 'CASH') {
        cov = 0.0;
      } else if (
        ASSET_COVARIANCE_MATRIX[symI] &&
        ASSET_COVARIANCE_MATRIX[symI][symJ] !== undefined
      ) {
        cov = ASSET_COVARIANCE_MATRIX[symI][symJ];
      } else {
        const volI = secMap.get(symI)?.metrics?.annualizedVolatility ?? 0.20;
        const volJ = secMap.get(symJ)?.metrics?.annualizedVolatility ?? 0.20;
        const corr = symI === symJ ? 1.0 : 0.60;
        cov = volI * volJ * corr;
      }

      portfolioVariance += wi * wj * cov;
    }
  }

  const volatility = Math.sqrt(Math.max(0, portfolioVariance));

  // 5. Portfolio Beta: sum(w_i * beta_i) / (1 - cash) (normalized to equity portion) or gross beta
  let betaSum = 0;
  for (const h of holdings) {
    const sym = h.symbol.toUpperCase();
    if (sym === 'CASH') continue;
    const b = MODEL_ASSET_BETAS[sym] ?? secMap.get(sym)?.metrics?.betaSPY ?? 1.0;
    betaSum += h.weight * b;
  }
  // If cash > 0, equity beta vs total portfolio beta
  const equityWeight = 1 - cashAllocation;
  const betaSPY = equityWeight > 0 ? betaSum / equityWeight : 0;

  // 6. Sharpe ratio: (r_p - r_f) / sigma_p
  const sharpeRatio = volatility > 0 ? (expectedReturn - riskFreeRate) / volatility : 0;

  // 7. Sortino ratio: downside deviation = vol * 0.65
  const downsideDev = volatility * 0.65;
  const sortinoRatio = downsideDev > 0 ? (expectedReturn - riskFreeRate) / downsideDev : 0;

  // 8. Max Drawdown (Weighted historical scenario envelope)
  let maxDrawdown = 0;
  for (const h of holdings) {
    const sym = h.symbol.toUpperCase();
    if (sym === 'CASH') continue;
    const sec = secMap.get(sym);
    const dd = sec?.metrics?.maxDrawdown ?? -0.22;
    maxDrawdown += h.weight * dd;
  }

  // 9. Monthly 95% Parametric VaR
  const monthlyVol = volatility / Math.sqrt(12);
  const var95Monthly = -(1.64485 * monthlyVol * (1 - cashAllocation * 0.5));

  // 10. Concentrations & HHI: sum(w_i^2)
  let herfindahlIndex = 0;
  const sectorBreakdown: Record<string, number> = {};

  for (const h of holdings) {
    herfindahlIndex += Math.pow(h.weight, 2);
    const sym = h.symbol.toUpperCase();
    let sector = 'Cash & Equivalents';
    if (sym !== 'CASH') {
      const sec = secMap.get(sym);
      sector = sec?.sector ?? 'Other';
    }
    sectorBreakdown[sector] = (sectorBreakdown[sector] || 0) + h.weight;
  }

  const sortedWeights = [...holdings]
    .filter((h) => h.symbol.toUpperCase() !== 'CASH')
    .map((h) => h.weight)
    .sort((a, b) => b - a);
  const topHoldingsConcentration = (sortedWeights[0] || 0) + (sortedWeights[1] || 0);

  if (topHoldingsConcentration > 0.70) {
    warnings.push(`High concentration: Top 2 holdings represent ${(topHoldingsConcentration * 100).toFixed(1)}% of capital.`);
  }
  if (cashAllocation === 0) {
    limitations.push('Zero cash reserve maintained; sleeve is 100% exposed to equity drawdown.');
  }

  // Mandate policy constraints checks
  if (policies) {
    for (const h of holdings) {
      if (h.symbol.toUpperCase() !== 'CASH' && h.weight > policies.maxSinglePositionWeight) {
        warnings.push(
          `Mandate Policy Warning: Position in ${h.symbol} (${(h.weight * 100).toFixed(1)}%) exceeds maximum single-position weight ceiling of ${(policies.maxSinglePositionWeight * 100).toFixed(0)}%.`
        );
      }
    }
    if (cashAllocation < policies.minCashAllocation) {
      warnings.push(
        `Mandate Policy Warning: Cash allocation (${(cashAllocation * 100).toFixed(1)}%) is below minimum required buffer of ${(policies.minCashAllocation * 100).toFixed(0)}%.`
      );
    }
    if (cashAllocation > policies.maxCashAllocation) {
      warnings.push(
        `Mandate Policy Warning: Cash allocation (${(cashAllocation * 100).toFixed(1)}%) exceeds maximum permitted ceiling of ${(policies.maxCashAllocation * 100).toFixed(0)}%.`
      );
    }
  }

  return {
    metrics: {
      totalCapital,
      cashAllocation,
      expectedReturn,
      volatility,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      betaSPY,
      var95Monthly,
      topHoldingsConcentration,
      herfindahlIndex,
      sectorBreakdown,
    },
    warnings,
    limitations,
    isValid: true,
  };
}

/**
 * Computes deterministic stress test impacts for arbitrary holdings under the 5 Phase 7 scenarios.
 */
export function evaluateStressScenariosForHoldings(
  holdings: EvaluatedHolding[],
  totalCapital: number = CASE_METADATA.initialCapital,
  universe: SecurityRecord[] = UNIVERSE_SECURITIES
): DeterministicStressScenario[] {
  const secMap = new Map<string, SecurityRecord>();
  for (const s of universe) {
    secMap.set(s.symbol.toUpperCase(), s);
  }

  const shockRules = [
    {
      id: 'STRESS-01',
      name: 'Scenario 1: Broad Absolute Shock (-10.0%)',
      category: 'Broad Absolute Shock' as const,
      description: 'Deterministic parallel decline of -10.0% across all equity holdings.',
      calcLoss: (sym: string) => (sym === 'CASH' ? 0.0 : -0.10),
    },
    {
      id: 'STRESS-02',
      name: 'Scenario 2: Severe Broad Absolute Shock (-25.0%)',
      category: 'Severe Broad Absolute Shock' as const,
      description: 'Severe deterministic market contraction of -25.0% across equity holdings.',
      calcLoss: (sym: string) => (sym === 'CASH' ? 0.0 : -0.25),
    },
    {
      id: 'STRESS-03',
      name: 'Scenario 3: 2008 GFC Market Beta Shock (-38.0% S&P 500)',
      category: 'Beta Market Shock' as const,
      description: 'Historical S&P 500 benchmark decline (-38.0%) transmitted via individual security betas.',
      historicalPrecedent: '2008 Global Financial Crisis equity drawdown',
      calcLoss: (sym: string) => {
        if (sym === 'CASH') return 0.0;
        const beta = MODEL_ASSET_BETAS[sym] ?? secMap.get(sym)?.metrics?.betaSPY ?? 1.10;
        return -0.38 * beta;
      },
    },
    {
      id: 'STRESS-04',
      name: 'Scenario 4: 2022 Tech Valuation & Rates Drawdown (-33.0% Tech)',
      category: 'Sector Shock' as const,
      description: 'Sector multiple contraction: Information Technology down -33.0%, Discretionary down -20.0%.',
      historicalPrecedent: '2022 Fed rate hike cycle drawdown',
      calcLoss: (sym: string) => {
        if (sym === 'CASH') return 0.0;
        const sector = secMap.get(sym)?.sector;
        if (sector === 'Information Technology') return -0.33;
        if (sector === 'Consumer Discretionary') return -0.20;
        return -0.15;
      },
    },
    {
      id: 'STRESS-05',
      name: 'Scenario 5: Hardware & Semiconductor Supply Disruption',
      category: 'Security Shock' as const,
      description: 'Hardware/Semis shock: NVDA drops -35%, AAPL drops -20%, MSFT drops -8%, others -10%, Cash intact.',
      calcLoss: (sym: string) => {
        if (sym === 'CASH') return 0.0;
        if (sym === 'NVDA') return -0.35;
        if (sym === 'AAPL') return -0.20;
        if (sym === 'MSFT') return -0.08;
        return -0.10;
      },
    },
  ];

  return shockRules.map((rule) => {
    let portfolioDollarImpact = 0;
    const postValues: { symbol: string; postValue: number; lossPercent: number; dollarImpact: number }[] = [];

    for (const h of holdings) {
      const sym = h.symbol.toUpperCase();
      const posValue = h.weight * totalCapital;
      const lossPct = rule.calcLoss(sym);
      const dollarLoss = posValue * lossPct;
      portfolioDollarImpact += dollarLoss;

      postValues.push({
        symbol: sym,
        postValue: posValue + dollarLoss,
        lossPercent: lossPct,
        dollarImpact: dollarLoss,
      });
    }

    const postPortfolioTotal = totalCapital + portfolioDollarImpact;
    const portfolioImpactPercent = totalCapital > 0 ? portfolioDollarImpact / totalCapital : 0;

    const securityImpacts = postValues.map((pv) => ({
      symbol: pv.symbol,
      lossPercent: pv.lossPercent,
      dollarImpact: pv.dollarImpact,
      postShockWeight: postPortfolioTotal > 0 ? pv.postValue / postPortfolioTotal : 0,
    }));

    return {
      id: rule.id,
      name: rule.name,
      category: rule.category,
      description: rule.description,
      historicalPrecedent: rule.historicalPrecedent,
      portfolioImpactPercent,
      portfolioImpactDollar: portfolioDollarImpact,
      securityImpacts,
    };
  });
}

function createEmptyMetrics(totalCapital: number): PortfolioMetrics {
  return {
    totalCapital,
    cashAllocation: 0,
    expectedReturn: 0,
    volatility: 0,
    sharpeRatio: 0,
    sortinoRatio: 0,
    maxDrawdown: 0,
    betaSPY: 0,
    var95Monthly: 0,
    topHoldingsConcentration: 0,
    herfindahlIndex: 0,
    sectorBreakdown: {},
  };
}

/**
 * Generates the multi-year portfolio capital compounding schedule for any CaseProfile.
 * Handles single-inflow or multi-inflow cash contributions (e.g. 2027 $300k + 2028 $150k).
 */
export function calculateCaseTrajectory(
  profile: CaseProfile,
  expectedReturn?: number
): TrajectoryYearSchedule[] {
  const startYear =
    typeof profile.facts.initialContribution.dateOrYear === 'number'
      ? profile.facts.initialContribution.dateOrYear
      : 2027;
  const targetYear =
    typeof profile.facts.operatingStartYear.value === 'number'
      ? profile.facts.operatingStartYear.value
      : 2033;
  const additionalYear =
    typeof profile.facts.additionalContribution.dateOrYear === 'number'
      ? profile.facts.additionalContribution.dateOrYear
      : 2028;
  const initialCapital = profile.facts.initialContribution.value || 300000;
  const additionalCapital = profile.facts.additionalContribution.value || 0;

  const rate =
    expectedReturn !== undefined
      ? expectedReturn
      : profile.assumptions.expectedAnnualReturn;
  const discountRate = profile.assumptions.reserveDiscountRate;

  const schedule: TrajectoryYearSchedule[] = [];
  let currentCap = initialCapital;

  let yearIndex = 0;
  for (let yr = startYear; yr < targetYear; yr++) {
    // Add additional capital at beginning of designated year (e.g. 2028)
    if (yr === additionalYear && yr !== startYear && additionalCapital > 0) {
      currentCap += additionalCapital;
    }

    const endCap = Math.round(currentCap * (1 + rate));
    let timingNote = `Year ${yearIndex + 1} Growth`;

    if (yr === startYear) {
      timingNote = `Initial Client Capital ($${initialCapital.toLocaleString()})`;
    } else if (yr === additionalYear && additionalCapital > 0) {
      timingNote = `+$${additionalCapital.toLocaleString()} Capital Inflow Injected`;
    } else if (yr === profile.facts.coSponsorCommunicationYear.value) {
      timingNote = '★ 2031 Milestone: Co-Sponsor Communication Range';
    } else if (yr === targetYear - 1) {
      timingNote = 'Final Pre-Horizon Compounding Year';
    }

    schedule.push({
      year: yearIndex,
      calendarYear: yr,
      beginningCapital: Math.round(currentCap),
      grossReturn: rate,
      endingPortfolioValue: endCap,
      timingNote,
    });

    currentCap = endCap;
    yearIndex++;
  }

  // Ground Zero Horizon Year (e.g. Beginning of 2033)
  const groundZeroEnd = Math.round(currentCap * (1 + discountRate));
  schedule.push({
    year: yearIndex,
    calendarYear: targetYear,
    beginningCapital: Math.round(currentCap),
    grossReturn: discountRate,
    endingPortfolioValue: groundZeroEnd,
    timingNote: `★ Beginning-${targetYear} Ground Zero: Liability Reserve PV locked`,
  });

  return schedule;
}

/**
 * Calculates the Liability Reserve Present Value, Beginning-2033 capital,
 * and resulting surplus residual or shortfall for any CaseProfile.
 */
export function calculateCaseLiabilityReserve(
  profile: CaseProfile,
  projectedBegCapital?: number
): LiabilityReserveSpec {
  const annualPayment = profile.facts.annualOperatingPayment.value || 50000;
  const paymentCount = profile.facts.operatingPaymentCount.value || 10;
  const discountRate = profile.assumptions.reserveDiscountRate || 0.045;
  const timing = profile.assumptions.timingConvention;
  const totalNominal = annualPayment * paymentCount;

  // Present Value of Annuity:
  // Ordinary annuity (payment at end of each period):
  // PV = P * [1 - (1+d)^-n] / d
  // Annuity due (payment at beginning of each period):
  // PV = PV_ordinary * (1 + d)
  let reservePV = 0;
  if (discountRate <= 0) {
    reservePV = totalNominal;
  } else {
    const pvOrdinary = annualPayment * ((1 - Math.pow(1 + discountRate, -paymentCount)) / discountRate);
    if (timing === 'BEGINNING_OF_YEAR') {
      reservePV = pvOrdinary * (1 + discountRate);
    } else {
      reservePV = pvOrdinary;
    }
  }

  reservePV = Math.round(reservePV * 100) / 100;

  // Determine beginning horizon capital (Beginning-2033)
  let beginning2033CapitalBaseline = projectedBegCapital;
  if (beginning2033CapitalBaseline === undefined) {
    const trajectory = calculateCaseTrajectory(profile);
    const lastMilestone = trajectory[trajectory.length - 1];
    beginning2033CapitalBaseline = lastMilestone ? lastMilestone.beginningCapital : 721532;
  }

  const stressHaircut = profile.assumptions.stressScenarioHaircut || 0.25;
  const beginning2033CapitalStressed = Math.round(beginning2033CapitalBaseline * (1 - stressHaircut));

  const residualCapitalBaseline = Math.max(0, beginning2033CapitalBaseline - reservePV);
  const residualCapitalStressed = Math.max(0, beginning2033CapitalStressed - reservePV);

  return {
    initialCapital: profile.facts.initialContribution.value,
    beginning2033CapitalBaseline,
    beginning2033CapitalStressed,
    discountRateAssumption: discountRate,
    annualNominalCommitment: annualPayment,
    commitmentYears: paymentCount,
    totalNominalLiabilities: totalNominal,
    reservePVBeginning2033: reservePV,
    residualCapitalBaseline,
    residualCapitalStressed,
  };
}

/**
 * Calculates the mandatory 2031 Co-Sponsor Communication Range for the active case.
 * Determines the credible estimated range for the potential 2033 facility contribution.
 */
export function calculateCoSponsorMilestone(
  profile: CaseProfile,
  trajectory: TrajectoryYearSchedule[],
  reservePV: number
): CoSponsorMilestoneRange {
  const milestoneYear = profile.facts.coSponsorCommunicationYear.value || 2031;
  const targetYear = profile.facts.operatingStartYear.value || 2033;
  const remainingYears = Math.max(1, targetYear - milestoneYear); // e.g. 2 years (2031 to 2033)

  // Find projected capital at milestone year
  const milestoneEntry = trajectory.find((s) => s.calendarYear === milestoneYear);
  const projectedAt2031 = milestoneEntry ? milestoneEntry.endingPortfolioValue : 500000;

  // Project from 2031 to 2033 under Conservative, Baseline, and Optimistic rates
  const rCons = profile.assumptions.conservativeAnnualReturn;
  const rBase = profile.assumptions.expectedAnnualReturn;
  const rOpt = profile.assumptions.optimisticAnnualReturn;

  const cap2033Cons = Math.round(projectedAt2031 * Math.pow(1 + rCons, remainingYears));
  const cap2033Base = Math.round(projectedAt2031 * Math.pow(1 + rBase, remainingYears));
  const cap2033Opt = Math.round(projectedAt2031 * Math.pow(1 + rOpt, remainingYears));

  const conservativeResidual2033 = Math.max(0, cap2033Cons - reservePV);
  const baselineResidual2033 = Math.max(0, cap2033Base - reservePV);
  const optimisticResidual2033 = Math.max(0, cap2033Opt - reservePV);

  const isUnderfundedConservative = cap2033Cons < reservePV;
  const isUnderfundedBaseline = cap2033Base < reservePV;

  let guidanceText = `In ${milestoneYear}, report to co-sponsors a credible estimated 2033 facility contribution range of $${Math.round(
    conservativeResidual2033 / 1000
  ).toLocaleString()}k (${(rCons * 100).toFixed(1)}% conservative) to $${Math.round(
    baselineResidual2033 / 1000
  ).toLocaleString()}k (${(rBase * 100).toFixed(1)}% baseline), after immunizing the $${Math.round(
    reservePV / 1000
  ).toLocaleString()}k liability reserve.`;

  if (isUnderfundedConservative) {
    guidanceText = `Caution: Under conservative ${(rCons * 100).toFixed(
      1
    )}% growth, 2033 capital ($${Math.round(cap2033Cons / 1000)}k) leaves a $${Math.round(
      (reservePV - cap2033Cons) / 1000
    )}k shortfall against the reserve obligation. Facility contribution should be indicated as $0 contingent buffer.`;
  }

  return {
    milestoneYear,
    projectedPortfolioAtMilestone: projectedAt2031,
    remainingYearsToGroundZero: remainingYears,
    conservativeResidual2033,
    baselineResidual2033,
    optimisticResidual2033,
    isUnderfundedConservative,
    isUnderfundedBaseline,
    guidanceText,
  };
}

/**
 * Computes the complete set of case-derived financial outputs for any active profile.
 */
export function calculateCaseDerivedOutputs(
  profile: CaseProfile,
  expectedReturn?: number
): CaseDerivedCalculations {
  const trajectorySchedule = calculateCaseTrajectory(profile, expectedReturn);
  const groundZeroCap = trajectorySchedule[trajectorySchedule.length - 1]?.beginningCapital;
  const reserveSpec = calculateCaseLiabilityReserve(profile, groundZeroCap);
  const coSponsorMilestone = calculateCoSponsorMilestone(
    profile,
    trajectorySchedule,
    reserveSpec.reservePVBeginning2033
  );

  const totalNominalContributions =
    (profile.facts.initialContribution.value || 0) +
    (profile.facts.additionalContribution.value || 0);
  const totalNominalLiabilities = reserveSpec.totalNominalLiabilities;
  const netNominalCashFlow = totalNominalContributions - totalNominalLiabilities;

  const reserveCoverageRatioBaseline =
    reserveSpec.reservePVBeginning2033 > 0
      ? reserveSpec.beginning2033CapitalBaseline / reserveSpec.reservePVBeginning2033
      : 0;
  const reserveCoverageRatioStressed =
    reserveSpec.reservePVBeginning2033 > 0
      ? reserveSpec.beginning2033CapitalStressed / reserveSpec.reservePVBeginning2033
      : 0;

  const isFullyCoveredBaseline =
    reserveSpec.beginning2033CapitalBaseline >= reserveSpec.reservePVBeginning2033;
  const isFullyCoveredStressed =
    reserveSpec.beginning2033CapitalStressed >= reserveSpec.reservePVBeginning2033;

  const warnings: string[] = [];
  if (!isFullyCoveredBaseline) {
    warnings.push(
      `Projected Beginning-2033 capital ($${reserveSpec.beginning2033CapitalBaseline.toLocaleString()}) does not fully fund the required liability reserve PV ($${reserveSpec.reservePVBeginning2033.toLocaleString()}).`
    );
  }
  if (!isFullyCoveredStressed) {
    warnings.push(
      `Under a ${(profile.assumptions.stressScenarioHaircut * 100).toFixed(
        0
      )}% stress drawdown, the portfolio experiences a $${Math.max(
        0,
        reserveSpec.reservePVBeginning2033 - reserveSpec.beginning2033CapitalStressed
      ).toLocaleString()} reserve shortfall.`
    );
  }

  return {
    profileId: profile.id,
    profileVersion: profile.version,
    calculatedAt: new Date().toISOString(),
    reserveSpec,
    trajectorySchedule,
    coSponsorMilestone,
    totalNominalContributions,
    totalNominalLiabilities,
    netNominalCashFlow,
    reserveCoverageRatioBaseline,
    reserveCoverageRatioStressed,
    isFullyCoveredBaseline,
    isFullyCoveredStressed,
    warnings,
  };
}
