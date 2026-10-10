/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Overview Workspace: How to Use This Platform (Editorial Practical Guide)
 * A clear, sequential 5-step workflow guide and real-time mandate readiness checklist.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { CaseProfile } from '../../types/caseTypes';
import { getActiveCaseProfile, validateCaseProfile } from '../../data/caseStorage';
import { loadSavedUniverse, loadUserProposals } from '../../data/userStorage';
import { loadAllDecisionRecords } from '../../data/decisionStorage';
import { formatCurrency } from '../../utils/formatters';
import {
  Briefcase,
  Search,
  Sliders,
  ShieldAlert,
  FileCheck,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  ChevronRight,
  Info,
} from 'lucide-react';

interface OverviewViewProps {
  activeProfile?: CaseProfile;
  onNavigate: (tab: 'overview' | 'case-setup' | 'research' | 'portfolio' | 'decision') => void;
  onSelectSecurity: (symbol: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  activeProfile: propProfile,
  onNavigate,
}) => {
  const profile = propProfile || getActiveCaseProfile();

  // Real application state queries
  const [universeCount, setUniverseCount] = useState<number>(0);
  const [proposalsCount, setProposalsCount] = useState<number>(0);
  const [evaluatedProposalsCount, setEvaluatedProposalsCount] = useState<number>(0);
  const [hasDecisionSignoff, setHasDecisionSignoff] = useState<boolean>(false);
  const [decisionStatus, setDecisionStatus] = useState<string>('PENDING_REVIEW');

  useEffect(() => {
    const universe = loadSavedUniverse();
    setUniverseCount(universe.length);

    const proposals = loadUserProposals();
    setProposalsCount(proposals.length);

    const evaluated = proposals.filter(
      (p) => p.evaluation && p.evaluation.isValid && !p.isDraft
    ).length;
    setEvaluatedProposalsCount(evaluated);

    // Read real persistent decision records for current case profile
    const allRecords = loadAllDecisionRecords();
    const recordsList = Object.values(allRecords);
    const activeCaseRecords = recordsList.filter((r) => r.caseProfileId === profile.id);
    const hasApprovedOrProposed = activeCaseRecords.some(
      (r) => r.status === 'ACCEPTED' || r.status === 'PROPOSED' || Boolean(r.teamRecommendation?.writtenRationale)
    );
    const latestStatus = activeCaseRecords[0]?.status || 'DRAFT';
    setDecisionStatus(latestStatus);
    setHasDecisionSignoff(hasApprovedOrProposed);
  }, []);

  // Profile validation status
  const profileValidation = useMemo(() => {
    return validateCaseProfile(profile);
  }, [profile]);

  // Real checklist evaluation (strictly based on actual application state)
  const checklist = useMemo(() => {
    const isStep1Done = profileValidation.isValid;
    const isStep2Done = universeCount >= 3;
    const isStep3Done = proposalsCount >= 1;
    const isStep4Done = evaluatedProposalsCount >= 1;
    const isStep5Done = hasDecisionSignoff;

    return [
      {
        step: 1,
        title: 'Case Setup & Mandate Facts',
        isComplete: isStep1Done,
        detail: isStep1Done
          ? `Verified profile "${profile.name}" (v${profile.version})`
          : 'Profile contains unresolved validation errors',
        targetTab: 'case-setup' as const,
      },
      {
        step: 2,
        title: 'Security Research Universe',
        isComplete: isStep2Done,
        detail:
          universeCount > 0
            ? `${universeCount} securities saved in personal universe`
            : 'No securities added to universe yet',
        targetTab: 'research' as const,
      },
      {
        step: 3,
        title: 'Portfolio Construction Proposals',
        isComplete: isStep3Done,
        detail:
          proposalsCount > 0
            ? `${proposalsCount} allocation proposals constructed`
            : 'No proposals created yet',
        targetTab: 'portfolio' as const,
      },
      {
        step: 4,
        title: 'Quantitative Risk & Stress Testing',
        isComplete: isStep4Done,
        detail:
          evaluatedProposalsCount > 0
            ? `${evaluatedProposalsCount} proposals evaluated with full covariance matrix`
            : 'Awaiting valid 100% allocation evaluation',
        targetTab: 'decision' as const,
      },
      {
        step: 5,
        title: 'CIO Decision & Signoff Memorandum',
        isComplete: isStep5Done,
        detail: hasDecisionSignoff
          ? `Status: ${decisionStatus.replace('_', ' ')}`
          : 'Pending Investment Committee signoff',
        targetTab: 'decision' as const,
      },
    ];
  }, [
    profile,
    profileValidation,
    universeCount,
    proposalsCount,
    evaluatedProposalsCount,
    hasDecisionSignoff,
    decisionStatus,
  ]);

  const completedStepsCount = checklist.filter((c) => c.isComplete).length;

  // 5 Step Workflow specifications
  const workflowSteps = [
    {
      step: 1,
      title: 'Set up a case',
      shortDesc: 'Establish client cash flows, lockup horizon, and mathematical modeling parameters.',
      whatYouDo:
        'Select or duplicate a case profile, verify client facts (capital inflows, withdrawal lockup, operating payments), adjust discount & return assumptions, and save.',
      expectedOutput:
        `A validated, persistent profile with locked Beginning-${profile.facts.operatingStartYear.value} Liability Reserve PV and annual compounding trajectory.`,
      ctaLabel: 'Go to Case Setup',
      targetTab: 'case-setup' as const,
      icon: Briefcase,
      isDone: checklist[0].isComplete,
      statusBadge: checklist[0].isComplete ? 'Configured' : 'Needs attention',
    },
    {
      step: 2,
      title: 'Research securities',
      shortDesc: 'Discover candidates, inspect SEC EDGAR filings, and resolve multi-vendor data.',
      whatYouDo:
        'Look up tickers, inspect audited 10-K/10-Q financial ratios, check vendor discrepancies (FMP vs Alpha Vantage), and save vetted candidates to your universe.',
      expectedOutput:
        'A persistent research universe of vetted securities meeting team policies and WInS verification thresholds.',
      ctaLabel: 'Open Research Universe',
      targetTab: 'research' as const,
      icon: Search,
      isDone: checklist[1].isComplete,
      statusBadge: `${universeCount} saved`,
    },
    {
      step: 3,
      title: 'Build a portfolio',
      shortDesc: 'Construct long-only allocation proposals and evaluate empirical covariance math.',
      whatYouDo:
        'Create draft proposals, assign portfolio weights across your universe, ensure allocations sum to 100.0%, and compare candidate fit against baseline holdings.',
      expectedOutput:
        'Exact portfolio expected return, annual volatility, Sharpe ratio, and beta computed via empirical sample covariance algebra.',
      ctaLabel: 'Open Portfolio Builder',
      targetTab: 'portfolio' as const,
      icon: Sliders,
      isDone: checklist[2].isComplete,
      statusBadge: `${proposalsCount} proposals`,
    },
    {
      step: 4,
      title: 'Assess risk',
      shortDesc: 'Subject allocations to deterministic macro shocks and check liability reserve coverage.',
      whatYouDo:
        'Run deterministic stress tests (2008 GFC, 2020 COVID, 2022 Tech Selloff, Stagflation) and inspect whether 2033 capital covers the liability reserve under severe drawdown.',
      expectedOutput:
        'Quantified drawdown impact in dollars and percentages, reserve coverage ratios, and identified tail shortfalls.',
      ctaLabel: 'Review Risk & Stress',
      targetTab: 'decision' as const,
      icon: ShieldAlert,
      isDone: checklist[3].isComplete,
      statusBadge: evaluatedProposalsCount > 0 ? 'Evaluated' : 'Pending evaluation',
    },
    {
      step: 5,
      title: 'Prepare the CIO decision',
      shortDesc: 'Review analytical evidence, record committee thesis notes, and generate signoff.',
      whatYouDo:
        'Select the final recommended allocation proposal, document qualitative risk justifications, sign off, and review the 2031 co-sponsor facility range.',
      expectedOutput:
        'An official, printable Investment Committee Governance Memorandum with lead analyst and faculty signoffs.',
      ctaLabel: 'Prepare CIO Decision',
      targetTab: 'decision' as const,
      icon: FileCheck,
      isDone: checklist[4].isComplete,
      statusBadge: hasDecisionSignoff ? 'Signed off' : 'Pending signoff',
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl font-sans pb-12">
      {/* 1. Header with Clear Instructional Subtitle */}
      <div className="border-b border-stone-200 pb-5">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-stone-500 uppercase tracking-normal">
              Platform Workflow Guide &amp; Research Protocol
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 mt-1 font-normal tracking-tight">
              Growth Sleeve Research Observatory
            </h1>
            <p className="text-sm text-stone-600 mt-1.5 max-w-3xl leading-relaxed">
              Follow the five-step research workflow below to configure case facts, evaluate candidates, construct allocations, and prepare the fiduciary decision memorandum.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs shrink-0">
            <span className="text-stone-500 font-sans">Active Mandate:</span>
            <button
              onClick={() => onNavigate('case-setup')}
              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xs border border-stone-300 transition-colors flex items-center gap-1 font-mono font-medium"
              title="Inspect or change active case profile in Case Setup"
            >
              <Briefcase className="w-3.5 h-3.5 text-stone-600" />
              <span>{profile.name} (v{profile.version})</span>
              <ChevronRight className="w-3 h-3 text-stone-400" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Active Case Context & Real Readiness Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Active Case Summary Context (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-xs p-5 space-y-4">
          <div className="flex justify-between items-start border-b border-stone-100 pb-3">
            <div>
              <span className="text-[11px] font-mono text-stone-500 uppercase block">Selected Case Profile</span>
              <h2 className="text-base font-serif font-semibold text-stone-900 mt-0.5">{profile.name}</h2>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-xs font-semibold uppercase border ${
                profile.isBaseline
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-stone-100 text-stone-800 border-stone-300'
              }`}
            >
              {profile.isBaseline ? 'Official Baseline' : 'Custom Profile'}
            </span>
          </div>

          <p className="text-xs text-stone-600 font-sans leading-relaxed">
            {profile.description}
          </p>

          {/* Essential Mandate Ground Truth */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
            <div className="p-2.5 bg-stone-50 rounded-xs border border-stone-200">
              <span className="text-[10px] text-stone-500 block font-sans">Initial Capital (2027)</span>
              <span className="font-bold text-stone-900">
                {formatCurrency(profile.facts.initialContribution.value, 0)}
              </span>
            </div>
            <div className="p-2.5 bg-stone-50 rounded-xs border border-stone-200">
              <span className="text-[10px] text-stone-500 block font-sans">Subsequent Inflow (2028)</span>
              <span className="font-bold text-stone-900">
                {formatCurrency(profile.facts.additionalContribution.value, 0)}
              </span>
            </div>
            <div className="p-2.5 bg-stone-50 rounded-xs border border-stone-200">
              <span className="text-[10px] text-stone-500 block font-sans">Lockup Horizon</span>
              <span className="font-bold text-stone-900">
                Through Beg-{profile.facts.operatingStartYear.value}
              </span>
            </div>
            <div className="p-2.5 bg-stone-50 rounded-xs border border-stone-200">
              <span className="text-[10px] text-stone-500 block font-sans">Operating Commitments</span>
              <span className="font-bold text-stone-900">
                {profile.facts.operatingPaymentCount.value}x {formatCurrency(profile.facts.annualOperatingPayment.value, 0)}
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-between items-center text-xs font-mono">
            <span className="text-[11px] text-stone-500 font-sans">Profile ID: {profile.id}</span>
            <button
              onClick={() => onNavigate('case-setup')}
              className="text-stone-900 hover:text-stone-700 font-medium font-sans flex items-center gap-1 text-xs"
            >
              <span>Edit case in Case Setup</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Real-Time Readiness Checklist (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-xs p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-stone-900 font-sans">Workflow Readiness Checklist</h2>
              <span className="text-[11px] text-stone-500 font-mono">
                Computed from live browser state · Never fabricated
              </span>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 bg-stone-100 text-stone-800 rounded-xs border border-stone-200">
              {completedStepsCount} of 5 Completed
            </span>
          </div>

          <div className="space-y-2.5">
            {checklist.map((item) => (
              <div
                key={item.step}
                onClick={() => onNavigate(item.targetTab)}
                className="p-3 rounded-xs border border-stone-200 hover:border-stone-400 hover:bg-stone-50/70 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.isComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-stone-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <span className="font-semibold text-stone-900 font-sans block truncate">
                      Step {item.step}: {item.title}
                    </span>
                    <span className="text-[11px] text-stone-500 font-mono block truncate">
                      {item.detail}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-stone-600 font-mono text-[11px] shrink-0">
                  <span className="hidden sm:inline">Go</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. The Five Research Workflow Steps */}
      <div className="space-y-4 pt-2">
        <div className="flex justify-between items-baseline border-b border-stone-200 pb-2">
          <h2 className="text-lg font-serif text-stone-900 font-medium">Step-by-Step Research Methodology</h2>
          <span className="text-xs text-stone-500 font-mono">Standard institutional fiduciary workflow</span>
        </div>

        <div className="space-y-4">
          {workflowSteps.map((ws) => {
            const Icon = ws.icon;
            return (
              <div
                key={ws.step}
                className="bg-white border border-stone-200 rounded-xs p-5 md:p-6 transition-all hover:border-stone-300 shadow-2xs space-y-4"
              >
                {/* Step Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xs bg-stone-900 text-stone-50 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                      {ws.step}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-stone-900 font-sans">
                          {ws.title}
                        </h3>
                        <span className="text-[11px] font-mono px-2 py-0.2 rounded-xs bg-stone-100 text-stone-700 border border-stone-200">
                          {ws.statusBadge}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 font-sans mt-0.5">
                        {ws.shortDesc}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigate(ws.targetTab)}
                    className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-xs text-xs font-medium font-sans flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0 shadow-2xs"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{ws.ctaLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* What You Do & Expected Output Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                  <div className="p-3.5 bg-stone-50 rounded-xs border border-stone-200 space-y-1">
                    <span className="font-semibold text-stone-900 block font-mono text-[11px] uppercase tracking-normal">
                      What You Do:
                    </span>
                    <p className="text-stone-700 leading-relaxed text-[11px]">
                      {ws.whatYouDo}
                    </p>
                  </div>

                  <div className="p-3.5 bg-stone-50 rounded-xs border border-stone-200 space-y-1">
                    <span className="font-semibold text-stone-900 block font-mono text-[11px] uppercase tracking-normal">
                      Expected Output:
                    </span>
                    <p className="text-stone-700 leading-relaxed text-[11px]">
                      {ws.expectedOutput}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
