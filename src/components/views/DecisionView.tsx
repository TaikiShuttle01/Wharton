/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Wharton Global High School Investment Competition - Quantitative Growth Sleeve
 * Refactored Decision & Risk Workspace (Evidence-Based Fiduciary Hub)
 *
 * Answers three core fiduciary questions:
 * 1. What changes if we adopt this portfolio proposal? (Proposal Impact)
 * 2. What risks and client-liability concerns remain? (Risk Assessment)
 * 3. What decision are we recommending, and what evidence supports it? (Decision Record & CIO Memo)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { CaseProfile } from '../../types/caseTypes';
import {
  CURRENT_PORTFOLIO_HOLDINGS,
  UNIVERSE_SECURITIES,
} from '../../data/quantModelData';
import { DeterministicStressScenario } from '../../types/quantTypes';
import {
  loadUserProposals,
  loadSavedUniverse,
  UserProposal,
} from '../../data/userStorage';
import { getActiveCaseProfile } from '../../data/caseStorage';
import {
  evaluatePortfolioWeights,
  evaluateStressScenariosForHoldings,
  calculateCaseDerivedOutputs,
} from '../../data/quantEngine';
import {
  PersistentDecisionRecord,
  DecisionStatus,
  TeamRecommendationStance,
  loadDecisionRecord,
  saveDecisionRecord,
} from '../../data/decisionStorage';
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatDelta,
} from '../../utils/formatters';
import { StressScenarioBars } from '../common/Charts';
import {
  Sliders,
  ShieldAlert,
  FileCheck,
  Printer,
  Save,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Layers,
  Flame,
  Info,
  Calendar,
  UserCheck,
  Scale,
  DollarSign,
  ChevronRight,
  FileText,
} from 'lucide-react';

interface DecisionViewProps {
  initialProposalId?: string;
  activeProfile?: CaseProfile;
  onNavigateToTab?: (tab: 'overview' | 'case-setup' | 'research' | 'portfolio' | 'decision') => void;
}

type DecisionTab = 'impact' | 'risk' | 'decision' | 'memo';

export const DecisionView: React.FC<DecisionViewProps> = ({
  initialProposalId,
  activeProfile: propProfile,
  onNavigateToTab,
}) => {
  const profile = propProfile || getActiveCaseProfile();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<DecisionTab>('impact');

  // Loaded user proposals
  const [proposals, setProposals] = useState<UserProposal[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string>(initialProposalId || 'PROP-01');

  // Interactive stress test scenario inspector
  const [selectedStressId, setSelectedStressId] = useState<string>('STRESS-01');

  // Decision record state
  const [decisionRecord, setDecisionRecord] = useState<PersistentDecisionRecord | null>(null);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  // Load proposals from userStorage
  useEffect(() => {
    const loaded = loadUserProposals();
    setProposals(loaded);

    let chosenId = initialProposalId || 'PROP-01';
    if (initialProposalId && loaded.some((p) => p.id === initialProposalId)) {
      chosenId = initialProposalId;
    } else if (loaded.length > 0) {
      chosenId = loaded[0].id;
    }
    setSelectedProposalId(chosenId);
  }, [initialProposalId]);

  // Selected proposal
  const selectedProposal = useMemo(() => {
    return proposals.find((p) => p.id === selectedProposalId) || proposals[0];
  }, [proposals, selectedProposalId]);

  // Load decision record when selected proposal or profile changes
  useEffect(() => {
    if (!selectedProposal) return;
    const record = loadDecisionRecord(
      profile.id,
      profile.version,
      profile.name,
      selectedProposal.id,
      selectedProposal.version || 1,
      selectedProposal.name,
      1
    );
    setDecisionRecord(record);
  }, [profile, selectedProposal]);

  const universe = useMemo(() => loadSavedUniverse(), []);

  // 1. EVALUATION: Consistent Assumptions for Both Portfolios
  // Current portfolio evaluated using active profile capital and discount/risk-free rate
  const currentEvaluation = useMemo(() => {
    return evaluatePortfolioWeights(
      CURRENT_PORTFOLIO_HOLDINGS,
      profile.facts.initialContribution.value,
      profile.assumptions.riskFreeRate,
      universe,
      profile.policies
    );
  }, [profile, universe]);

  // Selected proposal evaluated using identical parameters
  const proposedEvaluation = useMemo(() => {
    if (!selectedProposal || !selectedProposal.holdings) return null;
    return evaluatePortfolioWeights(
      selectedProposal.holdings,
      profile.facts.initialContribution.value,
      profile.assumptions.riskFreeRate,
      universe,
      profile.policies
    );
  }, [selectedProposal, profile, universe]);

  const curMetrics = currentEvaluation.metrics;
  const propMetrics = proposedEvaluation?.metrics;

  // 2. STRESS TEST EVALUATION: 5 Scenarios evaluated for both portfolios
  const proposedStressScenarios: DeterministicStressScenario[] = useMemo(() => {
    if (!selectedProposal || !selectedProposal.holdings) return [];
    return evaluateStressScenariosForHoldings(
      selectedProposal.holdings,
      profile.facts.initialContribution.value,
      universe
    );
  }, [selectedProposal, profile, universe]);

  const currentStressScenarios: DeterministicStressScenario[] = useMemo(() => {
    return evaluateStressScenariosForHoldings(
      CURRENT_PORTFOLIO_HOLDINGS,
      profile.facts.initialContribution.value,
      universe
    );
  }, [profile, universe]);

  const selectedStressScenario = useMemo(() => {
    return (
      proposedStressScenarios.find((s) => s.id === selectedStressId) ||
      proposedStressScenarios[0]
    );
  }, [proposedStressScenarios, selectedStressId]);

  const currentMatchedStress = useMemo(() => {
    return currentStressScenarios.find((s) => s.id === selectedStressId);
  }, [currentStressScenarios, selectedStressId]);

  // 3. CASE-DERIVED OUTPUTS: Liability Reserve & Surplus
  const derivedCase = useMemo(() => {
    const returnRate = propMetrics?.expectedReturn ?? profile.assumptions.expectedAnnualReturn;
    return calculateCaseDerivedOutputs(profile, returnRate);
  }, [profile, propMetrics]);

  // 4. HOLDINGS COMPARISON LIST (Before vs. After)
  const holdingsComparison = useMemo(() => {
    const map = new Map<
      string,
      {
        symbol: string;
        name: string;
        currentWeight: number;
        proposedWeight: number;
        sector: string;
      }
    >();

    // Current holdings
    for (const h of CURRENT_PORTFOLIO_HOLDINGS) {
      map.set(h.symbol.toUpperCase(), {
        symbol: h.symbol,
        name: h.name,
        currentWeight: h.weight,
        proposedWeight: 0,
        sector: h.sector,
      });
    }

    // Proposed holdings
    if (selectedProposal && selectedProposal.holdings) {
      for (const h of selectedProposal.holdings) {
        const sym = h.symbol.toUpperCase();
        const sec = universe.find((s) => s.symbol.toUpperCase() === sym);
        const existing = map.get(sym);
        if (existing) {
          existing.proposedWeight = h.weight;
        } else {
          map.set(sym, {
            symbol: h.symbol,
            name: sec?.name || (sym === 'CASH' ? 'Cash & Equivalents' : sym),
            currentWeight: 0,
            proposedWeight: h.weight,
            sector: sec?.sector || (sym === 'CASH' ? 'Cash & Equivalents' : 'General Equities'),
          });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.proposedWeight - a.proposedWeight);
  }, [selectedProposal, universe]);

  // 5. SECTOR ALLOCATION COMPARISON
  const sectorComparison = useMemo(() => {
    if (!curMetrics || !propMetrics) return [];
    const sectors = new Set<string>([
      ...Object.keys(curMetrics.sectorBreakdown || {}),
      ...Object.keys(propMetrics.sectorBreakdown || {}),
    ]);

    return Array.from(sectors).map((sector) => {
      const curW = curMetrics.sectorBreakdown?.[sector] || 0;
      const propW = propMetrics.sectorBreakdown?.[sector] || 0;
      return {
        sector,
        currentWeight: curW,
        proposedWeight: propW,
        delta: propW - curW,
      };
    }).sort((a, b) => b.proposedWeight - a.proposedWeight);
  }, [curMetrics, propMetrics]);

  // Handlers for Decision Record updates
  const handleSaveDecisionRecord = () => {
    if (!decisionRecord) return;
    const ok = saveDecisionRecord(decisionRecord);
    if (ok) {
      setSaveNotification('Decision record persisted successfully to browser storage.');
      setTimeout(() => setSaveNotification(null), 3500);
    }
  };

  const updateDecisionStatus = (newStatus: DecisionStatus) => {
    if (!decisionRecord) return;
    setDecisionRecord({
      ...decisionRecord,
      status: newStatus,
    });
  };

  const updateTeamRecommendation = (updates: Partial<PersistentDecisionRecord['teamRecommendation']>) => {
    if (!decisionRecord) return;
    setDecisionRecord({
      ...decisionRecord,
      teamRecommendation: {
        ...decisionRecord.teamRecommendation,
        ...updates,
      },
    });
  };

  const updateCIODecision = (updates: Partial<PersistentDecisionRecord['cioDecision']>) => {
    if (!decisionRecord) return;
    setDecisionRecord({
      ...decisionRecord,
      cioDecision: {
        ...decisionRecord.cioDecision,
        ...updates,
      },
    });
  };

  return (
    <div className="space-y-6 max-w-7xl font-sans pb-16">
      {/* 1. Header with Required Instructional Subtitle */}
      <div className="border-b border-stone-200 pb-5">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-stone-500 uppercase tracking-normal flex items-center gap-2 flex-wrap">
              <span>Mandate: {profile.policies.mandateId}</span>
              <span>·</span>
              <span>Horizon: Beg-{profile.facts.operatingStartYear.value}</span>
              <span>·</span>
              <span className="px-1.5 py-0.2 bg-stone-100 text-stone-700 rounded-xs font-semibold">
                Case: {profile.name} (v{profile.version})
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 mt-1 font-normal tracking-tight">
              Decision &amp; Risk Workspace
            </h1>
            <p className="text-sm text-stone-600 mt-1.5 max-w-3xl leading-relaxed">
              Compare a portfolio proposal against the current portfolio, assess downside risks and reserve coverage, then record an evidence-based recommendation.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 font-mono text-xs shrink-0">
            <button
              onClick={() => setActiveTab('memo')}
              className="px-3.5 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xs font-medium transition-colors flex items-center gap-1.5 font-sans"
              title="Inspect official Investment Committee memorandum"
            >
              <FileText className="w-3.5 h-3.5 text-stone-500" />
              <span>CIO Memorandum</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-xs font-medium transition-colors flex items-center gap-1.5 font-sans"
              title="Print official decision memorandum"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Global Proposal Selector & Sub-Navigation Tabs */}
        <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-stone-100">
          {/* Proposal Selector */}
          <div className="flex items-center gap-2.5 font-mono text-xs">
            <span className="text-stone-500 font-sans text-xs">Evaluating Proposal:</span>
            <select
              value={selectedProposalId}
              onChange={(e) => setSelectedProposalId(e.target.value)}
              className="bg-white border border-stone-300 rounded-xs px-3 py-1.5 text-stone-900 text-xs font-medium focus:outline-hidden focus:border-stone-500 font-mono shadow-2xs"
            >
              {proposals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id}: {p.name} {p.isDraft ? '(Draft)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 4 Workspace Tabs */}
          <div className="flex rounded-xs border border-stone-300 bg-stone-100 p-0.5 text-xs font-medium font-sans">
            <button
              onClick={() => setActiveTab('impact')}
              className={`px-3 py-1.5 rounded-xs transition-colors flex items-center gap-1.5 ${
                activeTab === 'impact'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-stone-600" />
              <span>1. Proposal Impact</span>
            </button>
            <button
              onClick={() => setActiveTab('risk')}
              className={`px-3 py-1.5 rounded-xs transition-colors flex items-center gap-1.5 ${
                activeTab === 'risk'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-stone-600" />
              <span>2. Risk Assessment</span>
            </button>
            <button
              onClick={() => setActiveTab('decision')}
              className={`px-3 py-1.5 rounded-xs transition-colors flex items-center gap-1.5 ${
                activeTab === 'decision'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5 text-stone-600" />
              <span>3. Decision Record</span>
            </button>
            <button
              onClick={() => setActiveTab('memo')}
              className={`px-3 py-1.5 rounded-xs transition-colors flex items-center gap-1.5 ${
                activeTab === 'memo'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-stone-600" />
              <span>4. CIO Memorandum</span>
            </button>
          </div>
        </div>

        {/* Persistence Notification Toast */}
        {saveNotification && (
          <div className="mt-3 p-2.5 rounded-xs bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-sans flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{saveNotification}</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: PROPOSAL IMPACT (What changes if we adopt this proposal?)      */}
      {/* ========================================================================= */}
      {activeTab === 'impact' && (
        <div className="space-y-6">
          {/* Proposal Summary Banner */}
          <div className="bg-white border border-stone-200 rounded-xs p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <span className="text-[11px] font-mono text-stone-500 uppercase block">Selected Proposal</span>
                <h2 className="text-base font-serif font-semibold text-stone-900 mt-0.5">
                  {selectedProposal ? selectedProposal.name : 'No Proposal Selected'} ({selectedProposal?.id})
                </h2>
                {selectedProposal?.description && (
                  <p className="text-xs text-stone-600 mt-1 font-sans">{selectedProposal.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-[11px] text-stone-500 font-sans">Mandate Baseline:</span>
                <span className="px-2 py-0.5 bg-stone-100 text-stone-800 rounded-xs border border-stone-200 font-semibold">
                  Current 4-Asset Sleeve
                </span>
              </div>
            </div>

            {/* Validation warning if proposal does not sum to 100% */}
            {proposedEvaluation && !proposedEvaluation.isValid && (
              <div className="mt-3 p-3 bg-amber-50 text-amber-900 border border-amber-300 rounded-xs text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Allocation Incomplete:</strong> {proposedEvaluation.validationError || 'Allocations must sum exactly to 100.0% before formal approval.'}
                  {selectedProposal?.holdings && (
                    <span className="font-mono ml-1">
                      (Total allocated: {(selectedProposal.holdings.reduce((sum, h) => sum + h.weight, 0) * 100).toFixed(1)}%)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Before & After Quantitative Comparison Table */}
          <div className="bg-white border border-stone-200 rounded-xs p-5 space-y-4 shadow-2xs">
            <div className="flex justify-between items-baseline border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-stone-900 font-sans">
                  Portfolio Metric Differentials (Current vs. Proposed)
                </h3>
                <span className="text-[11px] text-stone-500 font-mono">
                  Calculated using empirical sample covariance algebra and active case parameters
                </span>
              </div>
              <span className="text-[11px] font-mono text-stone-500">
                Capital: {formatCurrency(profile.facts.initialContribution.value, 0)} · Rf: {(profile.assumptions.riskFreeRate * 100).toFixed(1)}%
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 text-[11px] bg-stone-50/60">
                    <th className="py-2.5 px-3 font-medium">Metric</th>
                    <th className="py-2.5 px-3 font-medium text-right">Current Portfolio</th>
                    <th className="py-2.5 px-3 font-medium text-right">Proposed Portfolio</th>
                    <th className="py-2.5 px-3 font-medium text-right">Absolute Change</th>
                    <th className="py-2.5 px-3 font-medium text-left">Analytical Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {/* Expected Annual Return */}
                  <tr className="hover:bg-stone-50/50">
                    <td className="py-3 px-3 font-medium text-stone-900">
                      Expected Annual Return
                      <span className="text-[10px] text-stone-500 block font-sans">Weighted historical mean asset returns</span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-stone-800">
                      {formatPercent(curMetrics.expectedReturn)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-stone-900">
                      {propMetrics ? formatPercent(propMetrics.expectedReturn) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      {propMetrics ? (
                        <span className={propMetrics.expectedReturn >= curMetrics.expectedReturn ? 'text-emerald-800' : 'text-rose-800'}>
                          {formatDelta(propMetrics.expectedReturn - curMetrics.expectedReturn, true).text}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-3 text-left">
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xs font-sans">
                        CALCULATED OUTPUT
                      </span>
                    </td>
                  </tr>

                  {/* Annualized Volatility */}
                  <tr className="hover:bg-stone-50/50">
                    <td className="py-3 px-3 font-medium text-stone-900">
                      Annualized Volatility (σ)
                      <span className="text-[10px] text-stone-500 block font-sans">Portfolio standard deviation from covariance matrix</span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-stone-800">
                      {formatPercent(curMetrics.volatility)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-stone-900">
                      {propMetrics ? formatPercent(propMetrics.volatility) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      {propMetrics ? (
                        <span className={propMetrics.volatility <= curMetrics.volatility ? 'text-emerald-800' : 'text-amber-800'}>
                          {formatDelta(propMetrics.volatility - curMetrics.volatility, true).text}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-3 text-left">
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xs font-sans">
                        CALCULATED OUTPUT
                      </span>
                    </td>
                  </tr>

                  {/* Sharpe Ratio */}
                  <tr className="hover:bg-stone-50/50">
                    <td className="py-3 px-3 font-medium text-stone-900">
                      Sharpe Ratio
                      <span className="text-[10px] text-stone-500 block font-sans">(E[R] - Rf) / σ using {formatPercent(profile.assumptions.riskFreeRate)} discount</span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-stone-800">
                      {formatNumber(curMetrics.sharpeRatio, 3)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-stone-900">
                      {propMetrics ? formatNumber(propMetrics.sharpeRatio, 3) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      {propMetrics ? (
                        <span className={propMetrics.sharpeRatio >= curMetrics.sharpeRatio ? 'text-emerald-800' : 'text-rose-800'}>
                          {formatDelta(propMetrics.sharpeRatio - curMetrics.sharpeRatio, false).text}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-3 text-left">
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xs font-sans">
                        CALCULATED OUTPUT
                      </span>
                    </td>
                  </tr>

                  {/* Portfolio Beta */}
                  <tr className="hover:bg-stone-50/50">
                    <td className="py-3 px-3 font-medium text-stone-900">
                      Portfolio Beta to S&amp;P 500 (SPY)
                      <span className="text-[10px] text-stone-500 block font-sans">Weighted covariance to SPY benchmark</span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-stone-800">
                      {formatNumber(curMetrics.betaSPY, 2)}x
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-stone-900">
                      {propMetrics ? `${formatNumber(propMetrics.betaSPY, 2)}x` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      {propMetrics ? (
                        <span>
                          {formatDelta(propMetrics.betaSPY - curMetrics.betaSPY, false).text}x
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-3 text-left">
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xs font-sans">
                        CALCULATED OUTPUT
                      </span>
                    </td>
                  </tr>

                  {/* Top-2 Holdings Concentration */}
                  <tr className="hover:bg-stone-50/50">
                    <td className="py-3 px-3 font-medium text-stone-900">
                      Top-2 Holdings Concentration
                      <span className="text-[10px] text-stone-500 block font-sans">Cumulative weight of two largest positions</span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-stone-800">
                      {formatPercent(curMetrics.topHoldingsConcentration)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-stone-900">
                      {propMetrics ? formatPercent(propMetrics.topHoldingsConcentration) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      {propMetrics ? (
                        <span className={propMetrics.topHoldingsConcentration <= curMetrics.topHoldingsConcentration ? 'text-emerald-800' : 'text-amber-800'}>
                          {formatDelta(propMetrics.topHoldingsConcentration - curMetrics.topHoldingsConcentration, true).text}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-3 text-left">
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xs font-sans">
                        CALCULATED OUTPUT
                      </span>
                    </td>
                  </tr>

                  {/* Herfindahl-Hirschman Index (HHI) */}
                  <tr className="hover:bg-stone-50/50">
                    <td className="py-3 px-3 font-medium text-stone-900">
                      Herfindahl Index (HHI Concentration)
                      <span className="text-[10px] text-stone-500 block font-sans">Sum of squared portfolio weights (0.00 to 1.00)</span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-stone-800">
                      {formatNumber(curMetrics.herfindahlIndex, 3)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-stone-900">
                      {propMetrics ? formatNumber(propMetrics.herfindahlIndex, 3) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      {propMetrics ? (
                        <span>
                          {formatDelta(propMetrics.herfindahlIndex - curMetrics.herfindahlIndex, false).text}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-3 text-left">
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xs font-sans">
                        CALCULATED OUTPUT
                      </span>
                    </td>
                  </tr>

                  {/* Cash Buffer */}
                  <tr className="hover:bg-stone-50/50">
                    <td className="py-3 px-3 font-medium text-stone-900">
                      Cash &amp; Equivalents Buffer
                      <span className="text-[10px] text-stone-500 block font-sans">Unallocated liquid capital reserve</span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-stone-800">
                      {formatPercent(curMetrics.cashAllocation)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-stone-900">
                      {propMetrics ? formatPercent(propMetrics.cashAllocation) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      {propMetrics ? (
                        <span>
                          {formatDelta(propMetrics.cashAllocation - curMetrics.cashAllocation, true).text}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-3 text-left">
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xs font-sans">
                        USER ALLOCATION
                      </span>
                    </td>
                  </tr>

                  {/* Explicit Unavailable Metrics Row */}
                  <tr className="bg-stone-50/40 text-stone-500">
                    <td className="py-3 px-3 font-medium">
                      Sortino Ratio &amp; 95% Monthly VaR
                      <span className="text-[10px] text-stone-400 block font-sans">Downside semi-variance metrics</span>
                    </td>
                    <td className="py-3 px-3 text-right italic" colSpan={3}>
                      Unavailable — Requires ≥36 monthly historical observations for downside distribution modeling
                    </td>
                    <td className="py-3 px-3 text-left">
                      <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-600 border border-stone-200 rounded-xs font-sans">
                        MODEL LIMITATION
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Sector Exposure Shift & Holding Changes (2 columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Sector Exposure Shifts (5 cols) */}
            <div className="lg:col-span-5 bg-white border border-stone-200 rounded-xs p-5 space-y-4 shadow-2xs">
              <div className="border-b border-stone-100 pb-3">
                <h3 className="text-sm font-semibold text-stone-900 font-sans">
                  Sector Exposure Shifts
                </h3>
                <span className="text-[11px] text-stone-500 font-mono">
                  Current vs. proposed industry weight redistribution
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {sectorComparison.map((s) => (
                  <div key={s.sector} className="p-3 bg-stone-50 rounded-xs border border-stone-200 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-sans font-medium text-stone-900">{s.sector}</span>
                      <span className="font-bold text-stone-800">
                        {(s.proposedWeight * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-stone-500">
                      <span>Baseline: {(s.currentWeight * 100).toFixed(1)}%</span>
                      <span className={s.delta >= 0 ? 'text-emerald-800 font-semibold' : 'text-rose-800 font-semibold'}>
                        {s.delta >= 0 ? '+' : ''}{(s.delta * 100).toFixed(1)}% shift
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Holding-by-Holding Changes Table (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-stone-200 rounded-xs p-5 space-y-4 shadow-2xs">
              <div className="border-b border-stone-100 pb-3">
                <h3 className="text-sm font-semibold text-stone-900 font-sans">
                  Individual Holding Adjustments
                </h3>
                <span className="text-[11px] text-stone-500 font-mono">
                  Position weight changes and dollar rebalancing amounts
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500 text-[11px] bg-stone-50/60">
                      <th className="py-2.5 px-3 font-medium">Asset</th>
                      <th className="py-2.5 px-3 font-medium text-right">Current Weight</th>
                      <th className="py-2.5 px-3 font-medium text-right">Proposed Weight</th>
                      <th className="py-2.5 px-3 font-medium text-right">Net Change</th>
                      <th className="py-2.5 px-3 font-medium text-right">Proposed Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {holdingsComparison.map((h) => {
                      const netDelta = h.proposedWeight - h.currentWeight;
                      const proposedVal = h.proposedWeight * profile.facts.initialContribution.value;

                      return (
                        <tr key={h.symbol} className="hover:bg-stone-50/50">
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-stone-900">{h.symbol}</span>
                            <span className="text-[10px] text-stone-500 block truncate max-w-[140px] font-sans">
                              {h.name}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-stone-700">
                            {(h.currentWeight * 100).toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-stone-900">
                            {(h.proposedWeight * 100).toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">
                            <span className={netDelta > 0 ? 'text-emerald-800' : netDelta < 0 ? 'text-rose-800' : 'text-stone-500'}>
                              {netDelta > 0 ? '+' : ''}{(netDelta * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-stone-800">
                            {formatCurrency(proposedVal, 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: RISK ASSESSMENT (What risks and liability concerns remain?)    */}
      {/* ========================================================================= */}
      {activeTab === 'risk' && (
        <div className="space-y-6">
          {/* Fiduciary Liability Reserve & Coverage Integration */}
          <div className="bg-white border border-stone-200 rounded-xs p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-stone-700" />
                <h3 className="text-sm font-semibold text-stone-900 font-sans">
                  Fiduciary Liability Reserve &amp; Milestone Coverage Analysis
                </h3>
              </div>
              <span className="text-xs font-mono text-stone-500">
                Operating Start: Beg-{profile.facts.operatingStartYear.value} · Discount: {(profile.assumptions.reserveDiscountRate * 100).toFixed(1)}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3.5 bg-stone-50 rounded-xs border border-stone-200">
                <span className="text-[10px] text-stone-500 block font-sans">Reserve Requirement PV</span>
                <span className="text-base font-bold text-stone-900 block mt-1">
                  {formatCurrency(derivedCase.reserveSpec.reservePVBeginning2033, 0)}
                </span>
                <span className="text-[10px] text-stone-500 font-sans block mt-0.5">
                  10x {formatCurrency(profile.facts.annualOperatingPayment.value, 0)} annuity due
                </span>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-xs border border-stone-200">
                <span className="text-[10px] text-stone-500 block font-sans">Projected Compounded Capital</span>
                <span className="text-base font-bold text-stone-900 block mt-1">
                  {formatCurrency(derivedCase.reserveSpec.beginning2033CapitalBaseline, 0)}
                </span>
                <span className="text-[10px] text-stone-500 font-sans block mt-0.5">
                  Compounded @ {propMetrics ? formatPercent(propMetrics.expectedReturn, 1) : '21.9%'}
                </span>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-xs border border-stone-200">
                <span className="text-[10px] text-stone-500 block font-sans">Reserve Coverage Ratio</span>
                <span className={`text-base font-bold block mt-1 ${
                  derivedCase.reserveCoverageRatioBaseline >= 1.0 ? 'text-emerald-800' : 'text-rose-800'
                }`}>
                  {(derivedCase.reserveCoverageRatioBaseline * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-stone-500 font-sans block mt-0.5">
                  {derivedCase.reserveCoverageRatioBaseline >= 1.0 ? 'Fully funded coverage' : 'Underfunded shortfall'}
                </span>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-xs border border-stone-200">
                <span className="text-[10px] text-stone-500 block font-sans">
                  {derivedCase.reserveCoverageRatioBaseline >= 1.0 ? 'Mission Surplus' : 'Fiduciary Shortfall'}
                </span>
                <span className={`text-base font-bold block mt-1 ${
                  derivedCase.reserveCoverageRatioBaseline >= 1.0 ? 'text-emerald-800' : 'text-rose-800'
                }`}>
                  {formatCurrency(Math.abs(derivedCase.reserveSpec.residualCapitalBaseline), 0)}
                </span>
                <span className="text-[10px] text-stone-500 font-sans block mt-0.5">
                  {derivedCase.reserveCoverageRatioBaseline >= 1.0 ? 'Taiwan Residency Residual' : 'Capital deficit'}
                </span>
              </div>
            </div>

            {/* Mandatory 2031 Co-Sponsor Checkpoint Guidance */}
            <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 text-xs text-stone-700 font-sans flex items-start gap-2.5">
              <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-stone-900 font-mono text-[11px]">
                  2031 CO-SPONSOR CHECKPOINT FACILITY:
                </span>{' '}
                {derivedCase.coSponsorMilestone.guidanceText}
              </div>
            </div>
          </div>

          {/* Deterministic Macroeconomic Stress Testing (Phase 7 Scenarios) */}
          <div className="bg-white border border-stone-200 rounded-xs p-5 space-y-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-700" />
                  <h3 className="text-sm font-semibold text-stone-900 font-sans">
                    Deterministic Stress Loss Profile (5 Macroeconomic Shocks)
                  </h3>
                </div>
                <span className="text-[11px] text-stone-500 font-mono">
                  Fixed parameter shocks are analytical assumptions, not statistical return forecasts
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 rounded-xs font-mono font-medium">
                MODEL INPUT ASSUMPTIONS
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left: Stress Scenario Bars (6 cols) */}
              <div className="lg:col-span-6 space-y-3 font-mono text-xs">
                <span className="text-[11px] text-stone-600 block font-sans">
                  Drawdown severity across fixed deterministic shocks:
                </span>
                <StressScenarioBars
                  scenarios={proposedStressScenarios.map((sc) => ({
                    id: sc.id,
                    name: sc.name,
                    lossPct: sc.portfolioImpactPercent,
                    lossDollar: sc.portfolioImpactDollar,
                    description: sc.description,
                  }))}
                  onSelectScenario={(sc) => sc.id && setSelectedStressId(sc.id)}
                />
              </div>

              {/* Right: Detailed Scenario Breakdown & Asset Losses (6 cols) */}
              <div className="lg:col-span-6 space-y-4 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-stone-700 font-sans font-medium">Inspect Scenario Mechanics:</span>
                  <select
                    value={selectedStressId}
                    onChange={(e) => setSelectedStressId(e.target.value)}
                    className="bg-white border border-stone-300 rounded-xs px-2.5 py-1 text-stone-900 text-xs font-mono focus:outline-hidden"
                  >
                    {proposedStressScenarios.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedStressScenario && (
                  <div className="p-4 bg-stone-50 rounded-xs border border-stone-200 space-y-3">
                    <div className="text-xs text-stone-800 font-sans leading-relaxed">
                      {selectedStressScenario.description}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-200">
                      <div>
                        <span className="text-[10px] text-stone-500 font-sans block">Proposed Portfolio Loss</span>
                        <span className="text-sm font-bold text-rose-800">
                          {formatPercent(selectedStressScenario.portfolioImpactPercent, 2)} ({formatCurrency(selectedStressScenario.portfolioImpactDollar, 0)})
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 font-sans block">Current Portfolio Loss</span>
                        <span className="text-sm font-medium text-stone-800">
                          {currentMatchedStress
                            ? `${formatPercent(currentMatchedStress.portfolioImpactPercent, 2)} (${formatCurrency(currentMatchedStress.portfolioImpactDollar, 0)})`
                            : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Security-Level Breakdown Table */}
                    <div className="pt-2 border-t border-stone-200">
                      <span className="text-[11px] text-stone-600 font-sans font-medium block mb-1.5">
                        Individual Asset Stress Transmissions:
                      </span>
                      <div className="space-y-1">
                        {selectedStressScenario.securityImpacts.map((si) => (
                          <div
                            key={si.symbol}
                            className="flex justify-between items-center text-[11px] py-1 px-2 bg-white rounded-xs border border-stone-100"
                          >
                            <span className="font-bold text-stone-900">{si.symbol}</span>
                            <div className="flex items-center gap-3">
                              <span className={si.lossPercent < 0 ? 'text-rose-800 font-medium' : 'text-stone-600'}>
                                {formatPercent(si.lossPercent, 1)}
                              </span>
                              <span className="text-stone-500">
                                {formatCurrency(si.dollarImpact, 0)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Model Limitations & Concentration Warnings */}
          <div className="bg-white border border-stone-200 rounded-xs p-5 space-y-3 shadow-2xs font-sans text-xs">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
              <AlertTriangle className="w-4 h-4 text-stone-700" />
              <h3 className="text-sm font-semibold text-stone-900">
                Analytical Limitations &amp; Governance Notes
              </h3>
            </div>

            <div className="space-y-2 text-stone-700 leading-relaxed">
              <p>
                <strong>Provider Discrepancies:</strong> Financial metrics incorporate audited 10-K/10-Q SEC EDGAR filings as ground truth. Vendor aggregators exhibit documented variations (e.g., NVDA Debt-to-Equity is 0.784 in FMP vs. 0.766 in Alpha Vantage). No synthetic averaging is applied.
              </p>
              <p>
                <strong>Security Eligibility:</strong> Wharton Investment Competition (WInS) rule compliance is vetted manually by student analysts. WInS eligibility is documented in research dossiers and not automated via artificial UI bypass.
              </p>
              <p>
                <strong>Covariance Window:</strong> Covariance and correlation metrics reflect empirical monthly observations across the competition sample horizon. Tail risk may deviate under unprecedented liquidity contractions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: DECISION RECORD (What decision are we recommending?)           */}
      {/* ========================================================================= */}
      {activeTab === 'decision' && decisionRecord && (
        <div className="space-y-6">
          {/* Fiduciary Governance Boundary Notice */}
          <div className="bg-stone-50 border border-stone-300 rounded-xs p-4 flex items-start gap-3 text-xs text-stone-700 font-sans">
            <Info className="w-4 h-4 text-stone-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-stone-900 block font-mono text-[11px] uppercase tracking-normal">
                GOVERNANCE RECORDING BOUNDARY:
              </span>
              <p>
                Recording an Investment Committee decision documents formal analytical authorization for the growth sleeve proposal. <strong>Recording a decision does NOT execute live brokerage trades.</strong> Allocations remain subject to committee ratification and faculty sponsor verification.
              </p>
            </div>
          </div>

          {/* Governance Review Status Selector */}
          <div className="bg-white border border-stone-200 rounded-xs p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <span className="text-[11px] font-mono text-stone-500 uppercase block">Governance Status</span>
                <h3 className="text-base font-serif font-semibold text-stone-900 mt-0.5">
                  Record Investment Committee Decision
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveDecisionRecord}
                  className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-xs text-xs font-medium font-sans flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Decision Record</span>
                </button>
              </div>
            </div>

            {/* Status Button Group */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-stone-600 block uppercase">
                Committee Decision Status:
              </label>
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                {(['DRAFT', 'PROPOSED', 'ACCEPTED', 'REJECTED', 'NEEDS_REVISION'] as DecisionStatus[]).map((st) => {
                  const isSelected = decisionRecord.status === st;
                  return (
                    <button
                      key={st}
                      onClick={() => updateDecisionStatus(st)}
                      className={`px-3.5 py-1.5 rounded-xs transition-colors font-medium border ${
                        isSelected
                          ? st === 'ACCEPTED'
                            ? 'bg-emerald-800 text-white border-emerald-900 font-semibold shadow-xs'
                            : st === 'REJECTED'
                            ? 'bg-rose-800 text-white border-rose-900 font-semibold shadow-xs'
                            : st === 'PROPOSED'
                            ? 'bg-amber-800 text-white border-amber-900 font-semibold shadow-xs'
                            : 'bg-stone-900 text-white border-stone-900 font-semibold shadow-xs'
                          : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50 hover:border-stone-400'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Two-Column Form: Team Recommendation vs. Recorded CIO Decision */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left: Team Recommendation (Student Analysts) */}
            <div className="bg-white border border-stone-200 rounded-xs p-5 space-y-4 shadow-2xs font-sans text-xs">
              <div className="border-b border-stone-100 pb-3 flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-semibold text-stone-900">
                    1. Quantitative Team Recommendation
                  </h4>
                  <span className="text-[11px] text-stone-500 font-mono">
                    Student analyst recommendation thesis
                  </span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-700 border border-stone-200 rounded-xs font-mono">
                  TEAM RECOMMENDATION
                </span>
              </div>

              {/* Recommendation Stance Selector */}
              <div>
                <label className="text-[11px] font-mono text-stone-600 block mb-1">
                  Recommendation Stance:
                </label>
                <div className="flex gap-2 font-mono text-xs">
                  {(['RECOMMEND', 'NEUTRAL', 'DO_NOT_RECOMMEND'] as TeamRecommendationStance[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => updateTeamRecommendation({ stance: st })}
                      className={`px-3 py-1 rounded-xs border transition-colors ${
                        decisionRecord.teamRecommendation.stance === st
                          ? 'bg-stone-900 text-white border-stone-900 font-semibold'
                          : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      {st.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Written Rationale */}
              <div>
                <label className="text-[11px] font-mono text-stone-600 block mb-1">
                  Written Recommendation Rationale:
                </label>
                <textarea
                  rows={4}
                  value={decisionRecord.teamRecommendation.writtenRationale}
                  onChange={(e) => updateTeamRecommendation({ writtenRationale: e.target.value })}
                  placeholder="Articulate the investment thesis, diversification benefits, and why this proposal satisfies client goals..."
                  className="w-full text-xs font-sans text-stone-800 border border-stone-300 rounded-xs p-2.5 focus:outline-hidden focus:border-stone-500 leading-relaxed"
                />
              </div>

              {/* Key Risks */}
              <div>
                <label className="text-[11px] font-mono text-stone-600 block mb-1">
                  Key Risks &amp; Downside Vulnerabilities:
                </label>
                <textarea
                  rows={3}
                  value={decisionRecord.teamRecommendation.keyRisks}
                  onChange={(e) => updateTeamRecommendation({ keyRisks: e.target.value })}
                  placeholder="Identify concentration risks, semiconductor supply chain dependencies, valuation multiples..."
                  className="w-full text-xs font-sans text-stone-800 border border-stone-300 rounded-xs p-2.5 focus:outline-hidden focus:border-stone-500 leading-relaxed"
                />
              </div>

              {/* Unresolved Questions */}
              <div>
                <label className="text-[11px] font-mono text-stone-600 block mb-1">
                  Unresolved Questions &amp; Limitations:
                </label>
                <textarea
                  rows={2}
                  value={decisionRecord.teamRecommendation.unresolvedQuestions}
                  onChange={(e) => updateTeamRecommendation({ unresolvedQuestions: e.target.value })}
                  placeholder="Questions for faculty review or outstanding vendor data clarifications..."
                  className="w-full text-xs font-sans text-stone-800 border border-stone-300 rounded-xs p-2.5 focus:outline-hidden focus:border-stone-500 leading-relaxed"
                />
              </div>

              {/* Analyst Metadata */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-100 font-mono text-xs">
                <div>
                  <label className="text-[10px] text-stone-500 block font-sans">Lead Analyst</label>
                  <input
                    type="text"
                    value={decisionRecord.teamRecommendation.analystName}
                    onChange={(e) => updateTeamRecommendation({ analystName: e.target.value })}
                    className="w-full text-xs border border-stone-300 rounded-xs px-2 py-1 mt-1 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-500 block font-sans">Date</label>
                  <input
                    type="date"
                    value={decisionRecord.teamRecommendation.date}
                    onChange={(e) => updateTeamRecommendation({ date: e.target.value })}
                    className="w-full text-xs border border-stone-300 rounded-xs px-2 py-1 mt-1 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Right: Recorded CIO Committee Decision */}
            <div className="bg-white border border-stone-200 rounded-xs p-5 space-y-4 shadow-2xs font-sans text-xs">
              <div className="border-b border-stone-100 pb-3 flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-semibold text-stone-900">
                    2. Recorded CIO Committee Decision
                  </h4>
                  <span className="text-[11px] text-stone-500 font-mono">
                    Official Investment Committee signoff
                  </span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 bg-stone-900 text-stone-50 rounded-xs font-mono">
                  GOVERNANCE RECORD
                </span>
              </div>

              {/* Written CIO Rationale */}
              <div>
                <label className="text-[11px] font-mono text-stone-600 block mb-1">
                  CIO / Faculty Sponsor Recorded Rationale:
                </label>
                <textarea
                  rows={4}
                  value={decisionRecord.cioDecision.writtenRationale}
                  onChange={(e) => updateCIODecision({ writtenRationale: e.target.value })}
                  placeholder="Record formal investment committee feedback, acceptance conditions, or revision instructions..."
                  className="w-full text-xs font-sans text-stone-800 border border-stone-300 rounded-xs p-2.5 focus:outline-hidden focus:border-stone-500 leading-relaxed"
                />
              </div>

              {/* Conditions or Revisions */}
              <div>
                <label className="text-[11px] font-mono text-stone-600 block mb-1">
                  Conditions or Required Revisions (if applicable):
                </label>
                <textarea
                  rows={3}
                  value={decisionRecord.cioDecision.conditionsOrRevisions}
                  onChange={(e) => updateCIODecision({ conditionsOrRevisions: e.target.value })}
                  placeholder="e.g. Requires maintaining minimum 10% cash until 2028 cash inflow..."
                  className="w-full text-xs font-sans text-stone-800 border border-stone-300 rounded-xs p-2.5 focus:outline-hidden focus:border-stone-500 leading-relaxed"
                />
              </div>

              {/* Decision Maker Metadata */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-100 font-mono text-xs">
                <div>
                  <label className="text-[10px] text-stone-500 block font-sans">Decision Maker / CIO</label>
                  <input
                    type="text"
                    value={decisionRecord.cioDecision.decisionMaker}
                    onChange={(e) => updateCIODecision({ decisionMaker: e.target.value })}
                    className="w-full text-xs border border-stone-300 rounded-xs px-2 py-1 mt-1 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-500 block font-sans">Signoff Date</label>
                  <input
                    type="date"
                    value={decisionRecord.cioDecision.date}
                    onChange={(e) => updateCIODecision({ date: e.target.value })}
                    className="w-full text-xs border border-stone-300 rounded-xs px-2 py-1 mt-1 font-mono"
                  />
                </div>
              </div>

              {/* Provenance Traceability Stamp */}
              <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 font-mono text-[11px] text-stone-600 space-y-1">
                <div className="font-semibold text-stone-800 font-sans text-xs">Governance Traceability Metadata:</div>
                <div>Case Profile: {decisionRecord.caseProfileName} (ID: {decisionRecord.caseProfileId}, v{decisionRecord.caseProfileVersion})</div>
                <div>Proposal Target: {decisionRecord.proposalName} (ID: {decisionRecord.proposalId}, v{decisionRecord.proposalVersion})</div>
                <div>Analysis Timestamp: {new Date(decisionRecord.analysisTimestamp).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: CIO MEMORANDUM (Printable Investment Committee Memorandum)    */}
      {/* ========================================================================= */}
      {activeTab === 'memo' && (
        <div className="space-y-6">
          {/* Print Toolbar Bar */}
          <div className="bg-white border border-stone-200 rounded-xs p-4 flex justify-between items-center text-xs font-mono shadow-2xs">
            <span className="text-stone-600 font-sans">
              Printable Investment Committee Governance Memorandum
            </span>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-xs font-medium font-sans flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Memorandum (PDF / Paper)</span>
            </button>
          </div>

          {/* PRINTABLE MEMORANDUM CONTAINER (Formatted for Print) */}
          <div className="bg-white border-2 border-stone-800 rounded-xs p-8 sm:p-12 space-y-8 font-sans text-xs text-stone-900 shadow-md printable-memo">
            {/* Memorandum Header */}
            <div className="border-b-2 border-stone-900 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest block">
                  Wharton Global High School Investment Competition · Growth Sleeve
                </span>
                <h2 className="text-2xl font-serif font-bold text-stone-900 tracking-tight mt-1">
                  Investment Committee Decision Memorandum
                </h2>
                <div className="text-xs font-mono text-stone-600 mt-1 flex flex-wrap gap-2">
                  <span>Mandate: {profile.policies.mandateId}</span>
                  <span>·</span>
                  <span>Case: {profile.name} (v{profile.version})</span>
                  <span>·</span>
                  <span>Horizon: Beg-{profile.facts.operatingStartYear.value}</span>
                </div>
              </div>

              <div className="text-left sm:text-right font-mono text-xs">
                <span className="text-[10px] text-stone-500 block uppercase">Governance Status:</span>
                <span className="text-base font-bold uppercase text-stone-900">
                  {decisionRecord?.status || 'DRAFT'}
                </span>
                <span className="text-[11px] text-stone-500 block mt-0.5">
                  Date: {decisionRecord?.cioDecision.date || new Date().toISOString().split('T')[0]}
                </span>
              </div>
            </div>

            {/* Section I: Proposal Candidate & Differentials */}
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-sm text-stone-900 border-b border-stone-300 pb-1 uppercase tracking-tight">
                I. Proposed Allocation &amp; Performance Differentials
              </h3>
              <p className="text-stone-800 leading-relaxed text-xs">
                The student quantitative team evaluated proposed allocation <strong className="font-mono">{selectedProposal?.name}</strong> ({selectedProposal?.id}) against the baseline current portfolio.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border border-stone-200">
                  <thead>
                    <tr className="bg-stone-100 text-stone-700 text-[11px]">
                      <th className="py-2 px-3">Metric</th>
                      <th className="py-2 px-3 text-right">Current Portfolio</th>
                      <th className="py-2 px-3 text-right">Proposed Portfolio</th>
                      <th className="py-2 px-3 text-right">Net Differential</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    <tr>
                      <td className="py-2 px-3 font-medium">Expected Return (Annual)</td>
                      <td className="py-2 px-3 text-right">{formatPercent(curMetrics.expectedReturn)}</td>
                      <td className="py-2 px-3 text-right font-bold">{propMetrics ? formatPercent(propMetrics.expectedReturn) : '—'}</td>
                      <td className="py-2 px-3 text-right font-bold">
                        {propMetrics ? formatDelta(propMetrics.expectedReturn - curMetrics.expectedReturn, true).text : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium">Annual Volatility (σ)</td>
                      <td className="py-2 px-3 text-right">{formatPercent(curMetrics.volatility)}</td>
                      <td className="py-2 px-3 text-right font-bold">{propMetrics ? formatPercent(propMetrics.volatility) : '—'}</td>
                      <td className="py-2 px-3 text-right">
                        {propMetrics ? formatDelta(propMetrics.volatility - curMetrics.volatility, true).text : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium">Sharpe Ratio (Rf = {(profile.assumptions.riskFreeRate * 100).toFixed(1)}%)</td>
                      <td className="py-2 px-3 text-right">{formatNumber(curMetrics.sharpeRatio, 3)}</td>
                      <td className="py-2 px-3 text-right font-bold">{propMetrics ? formatNumber(propMetrics.sharpeRatio, 3) : '—'}</td>
                      <td className="py-2 px-3 text-right">
                        {propMetrics ? formatDelta(propMetrics.sharpeRatio - curMetrics.sharpeRatio, false).text : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium">Portfolio Beta to SPY</td>
                      <td className="py-2 px-3 text-right">{formatNumber(curMetrics.betaSPY, 2)}x</td>
                      <td className="py-2 px-3 text-right font-bold">{propMetrics ? `${formatNumber(propMetrics.betaSPY, 2)}x` : '—'}</td>
                      <td className="py-2 px-3 text-right">
                        {propMetrics ? `${formatDelta(propMetrics.betaSPY - curMetrics.betaSPY, false).text}x` : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium">Top-2 Concentration</td>
                      <td className="py-2 px-3 text-right">{formatPercent(curMetrics.topHoldingsConcentration)}</td>
                      <td className="py-2 px-3 text-right font-bold">{propMetrics ? formatPercent(propMetrics.topHoldingsConcentration) : '—'}</td>
                      <td className="py-2 px-3 text-right">
                        {propMetrics ? formatDelta(propMetrics.topHoldingsConcentration - curMetrics.topHoldingsConcentration, true).text : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section II: Downside Stress Assessment */}
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-sm text-stone-900 border-b border-stone-300 pb-1 uppercase tracking-tight">
                II. Downside Stress Testing &amp; Macro Vulnerabilities
              </h3>
              <p className="text-stone-800 text-xs">
                Allocations were subjected to the five deterministic Phase 7 macroeconomic shock scenarios. Shocks reflect model assumptions:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                {proposedStressScenarios.map((sc) => (
                  <div key={sc.id} className="p-2.5 bg-stone-50 border border-stone-200 rounded-xs">
                    <span className="font-bold text-stone-900 block font-sans text-xs">{sc.name}</span>
                    <span className="text-rose-800 font-bold block mt-0.5">
                      Loss: {formatPercent(sc.portfolioImpactPercent, 2)} ({formatCurrency(sc.portfolioImpactDollar, 0)})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section III: Fiduciary Liability Reserve & Coverage */}
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-sm text-stone-900 border-b border-stone-300 pb-1 uppercase tracking-tight">
                III. Fiduciary Liability Reserve &amp; Milestone Coverage
              </h3>
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xs font-mono text-xs space-y-1.5">
                <div>Beginning-{profile.facts.operatingStartYear.value} Reserve Requirement PV: <strong className="text-stone-900">{formatCurrency(derivedCase.reserveSpec.reservePVBeginning2033, 0)}</strong> (10x {formatCurrency(profile.facts.annualOperatingPayment.value, 0)} discounted @ {(profile.assumptions.reserveDiscountRate * 100).toFixed(1)}%)</div>
                <div>Projected Compounded Capital: <strong className="text-stone-900">{formatCurrency(derivedCase.reserveSpec.beginning2033CapitalBaseline, 0)}</strong></div>
                <div>Reserve Coverage Ratio: <strong className={derivedCase.reserveCoverageRatioBaseline >= 1.0 ? 'text-emerald-800' : 'text-rose-800'}>{(derivedCase.reserveCoverageRatioBaseline * 100).toFixed(1)}%</strong></div>
                <div>Mission Residual Surplus: <strong className="text-stone-900">{formatCurrency(derivedCase.reserveSpec.residualCapitalBaseline, 0)}</strong></div>
                <div className="text-[11px] text-stone-600 font-sans pt-1 border-t border-stone-200">
                  {derivedCase.coSponsorMilestone.guidanceText}
                </div>
              </div>
            </div>

            {/* Section IV: Team Recommendation & Rationale */}
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-sm text-stone-900 border-b border-stone-300 pb-1 uppercase tracking-tight">
                IV. Analyst Recommendation &amp; Committee Notes
              </h3>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-mono text-[11px] text-stone-500 block uppercase">Team Stance:</span>
                  <span className="font-bold text-stone-900 font-mono">
                    {decisionRecord?.teamRecommendation.stance.replace(/_/g, ' ')}
                  </span>
                </div>

                <div>
                  <span className="font-mono text-[11px] text-stone-500 block uppercase">Recommendation Rationale:</span>
                  <p className="text-stone-800 italic bg-stone-50 p-3 rounded-xs border border-stone-200 leading-relaxed">
                    "{decisionRecord?.teamRecommendation.writtenRationale || 'No written analyst rationale entered.'}"
                  </p>
                </div>

                {decisionRecord?.teamRecommendation.keyRisks && (
                  <div>
                    <span className="font-mono text-[11px] text-stone-500 block uppercase">Identified Risks:</span>
                    <p className="text-stone-800 bg-stone-50 p-2.5 rounded-xs border border-stone-200">
                      {decisionRecord.teamRecommendation.keyRisks}
                    </p>
                  </div>
                )}

                {decisionRecord?.cioDecision.writtenRationale && (
                  <div>
                    <span className="font-mono text-[11px] text-stone-500 block uppercase">CIO Committee Rationale &amp; Conditions:</span>
                    <p className="text-stone-800 bg-stone-50 p-3 rounded-xs border border-stone-200 leading-relaxed font-sans">
                      {decisionRecord.cioDecision.writtenRationale}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Formal Governance Signature Blocks */}
            <div className="border-t-2 border-stone-900 pt-8 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs font-mono">
              <div>
                <span className="text-[10px] text-stone-500 block uppercase font-sans">Lead Quantitative Analyst:</span>
                <span className="font-bold text-stone-900 border-b border-stone-800 block pb-1.5 mt-4">
                  {decisionRecord?.teamRecommendation.analystName || 'Student Quantitative Lead'}
                </span>
                <span className="text-[10px] text-stone-400 block mt-1">
                  Date: {decisionRecord?.teamRecommendation.date || '—'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-stone-500 block uppercase font-sans">
                  Chief Investment Officer / Faculty Sponsor:
                </span>
                <span className="font-bold text-stone-900 border-b border-stone-800 block pb-1.5 mt-4">
                  {decisionRecord?.cioDecision.decisionMaker || 'Investment Committee CIO'}
                </span>
                <span className="text-[10px] text-stone-400 block mt-1">
                  Status: {decisionRecord?.status || 'DRAFT'} · Date: {decisionRecord?.cioDecision.date || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
