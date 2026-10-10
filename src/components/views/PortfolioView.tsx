/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * User-Defined Portfolio Builder & Mathematical Construction Workspace
 */

import React, { useState, useEffect, useMemo } from 'react';
import { SecurityRecord, PortfolioHolding } from '../../types/quantTypes';
import { CaseProfile } from '../../types/caseTypes';
import {
  CURRENT_PORTFOLIO_HOLDINGS,
  CURRENT_PORTFOLIO_METRICS,
} from '../../data/quantModelData';
import {
  loadSavedUniverse,
  loadUserProposals,
  saveUserProposals,
  createUserProposal,
  updateUserProposal,
  duplicateUserProposal,
  deleteUserProposal,
  UserProposal,
} from '../../data/userStorage';
import { getActiveCaseProfile } from '../../data/caseStorage';
import { evaluatePortfolioWeights, calculateCaseDerivedOutputs } from '../../data/quantEngine';
import { formatCurrency, formatPercent, formatNumber, formatDelta } from '../../utils/formatters';
import { AllocationBarChart, TrajectoryInteractiveChart } from '../common/Charts';
import {
  Plus,
  Trash2,
  Copy,
  Edit2,
  Save,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  PieChart,
  Sliders,
  FolderOpen,
  FileText,
  RotateCcw,
  Briefcase,
} from 'lucide-react';

interface PortfolioViewProps {
  activeProfile?: CaseProfile;
  onSelectSecurity: (symbol: string) => void;
  onSelectProposalForReview: (proposalId: string) => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  activeProfile: propProfile,
  onSelectSecurity,
  onSelectProposalForReview,
}) => {
  const profile = propProfile || getActiveCaseProfile();
  const totalCapital = profile.facts.initialContribution.value || 300000;
  const [activeSubTab, setActiveSubTab] = useState<'current' | 'builder' | 'compare'>('builder');

  // Loaded user data
  const [universe, setUniverse] = useState<SecurityRecord[]>([]);
  const [proposals, setProposals] = useState<UserProposal[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string>('PROP-01');

  // Proposal editing state
  const [proposalName, setProposalName] = useState('');
  const [proposalDesc, setProposalDesc] = useState('');
  const [positions, setPositions] = useState<{ symbol: string; weightPercent: number }[]>([]);
  const [candidateToAdd, setCandidateToAdd] = useState('AAPL');
  const [isDraft, setIsDraft] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'warn' | 'error' } | null>(null);

  // Initialize
  useEffect(() => {
    const u = loadSavedUniverse();
    setUniverse(u);
    const p = loadUserProposals();
    setProposals(p);

    if (p.length > 0) {
      loadProposalIntoEditor(p[0]);
    }
  }, []);

  const triggerNotify = (message: string, type: 'success' | 'warn' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadProposalIntoEditor = (prop: UserProposal) => {
    setSelectedProposalId(prop.id);
    setProposalName(prop.name);
    setProposalDesc(prop.description || '');
    setIsDraft(prop.isDraft || false);
    setPositions(
      prop.holdings.map((h) => ({
        symbol: h.symbol,
        weightPercent: Math.round(h.weight * 1000) / 10, // e.g. 45.0
      }))
    );
  };

  const handleSelectProposal = (id: string) => {
    const p = proposals.find((x) => x.id === id);
    if (p) loadProposalIntoEditor(p);
  };

  // Weight calculations and validation
  const totalWeightPercent = positions.reduce((acc, p) => acc + (Number(p.weightPercent) || 0), 0);
  const isAllocationValid = Math.abs(totalWeightPercent - 100.0) <= 0.5;

  // Real engine evaluation for the currently edited positions
  const liveEvaluation = React.useMemo(() => {
    const holdings = positions.map((p) => ({
      symbol: p.symbol,
      weight: (Number(p.weightPercent) || 0) / 100,
    }));
    return evaluatePortfolioWeights(holdings, totalCapital, profile.assumptions.riskFreeRate, universe, profile.policies);
  }, [positions, universe, totalCapital, profile]);

  const derivedCase = useMemo(() => {
    return calculateCaseDerivedOutputs(profile, CURRENT_PORTFOLIO_METRICS.expectedReturn);
  }, [profile]);

  // Position editing handlers
  const handleWeightChange = (symbol: string, newWeightStr: string) => {
    const num = parseFloat(newWeightStr);
    const validNum = isNaN(num) ? 0 : Math.max(0, Math.min(100, num));
    setPositions((prev) =>
      prev.map((p) => (p.symbol === symbol ? { ...p, weightPercent: validNum } : p))
    );
  };

  const handleRemovePosition = (symbol: string) => {
    setPositions((prev) => prev.filter((p) => p.symbol !== symbol));
  };

  const handleAddPosition = () => {
    if (!candidateToAdd) return;
    const exists = positions.some((p) => p.symbol.toUpperCase() === candidateToAdd.toUpperCase());
    if (exists) {
      triggerNotify(`${candidateToAdd} is already in this proposal.`, 'warn');
      return;
    }
    setPositions((prev) => [...prev, { symbol: candidateToAdd, weightPercent: 0 }]);
  };

  const handleSaveProposal = () => {
    if (!proposalName.trim()) {
      triggerNotify('Please provide a name for this proposal.', 'warn');
      return;
    }

    const holdings = positions.map((p) => ({
      symbol: p.symbol,
      weight: (Number(p.weightPercent) || 0) / 100,
    }));

    const currentProp = proposals.find((p) => p.id === selectedProposalId);
    if (currentProp) {
      // Update
      const updated: UserProposal = {
        ...currentProp,
        name: proposalName.trim(),
        description: proposalDesc.trim(),
        holdings,
        isDraft,
        updatedAt: new Date().toISOString(),
      };
      updateUserProposal(updated);
      setProposals(loadUserProposals());
      triggerNotify(`Proposal "${proposalName}" saved successfully.`, 'success');
    } else {
      // Create new
      const created = createUserProposal(proposalName, holdings, proposalDesc, isDraft);
      setProposals(loadUserProposals());
      setSelectedProposalId(created.id);
      triggerNotify(`New proposal "${proposalName}" created.`, 'success');
    }
  };

  const handleCreateNewBlank = () => {
    const blankProp = createUserProposal(
      `Custom Proposal ${proposals.length + 1}`,
      [
        { symbol: 'AAPL', weight: 0.5 },
        { symbol: 'MSFT', weight: 0.5 },
      ],
      '',
      true
    );
    const updated = loadUserProposals();
    setProposals(updated);
    loadProposalIntoEditor(blankProp);
    triggerNotify('Blank draft proposal created. Adjust weights and save.', 'success');
  };

  const handleDuplicate = () => {
    const dup = duplicateUserProposal(selectedProposalId);
    if (dup) {
      const updated = loadUserProposals();
      setProposals(updated);
      loadProposalIntoEditor(dup);
      triggerNotify(`Duplicated proposal as "${dup.name}".`, 'success');
    }
  };

  const handleDeleteProposal = (idToDelete: string, nameToDelete?: string) => {
    const targetName = nameToDelete || proposals.find((p) => p.id === idToDelete)?.name || idToDelete;
    deleteUserProposal(idToDelete);
    const updated = loadUserProposals();
    setProposals(updated);
    if (selectedProposalId === idToDelete) {
      if (updated.length > 0) {
        loadProposalIntoEditor(updated[0]);
      } else {
        handleCreateNewBlank();
      }
    }
    triggerNotify(`Deleted proposal "${targetName}".`, 'success');
  };

  // Color generator for allocation bar chart
  const palette = ['#1e3a8a', '#334155', '#d97706', '#059669', '#7c3aed', '#db2777', '#0891b2'];
  const chartItems = positions.map((p, idx) => ({
    label: p.symbol,
    weight: (Number(p.weightPercent) || 0) / 100,
    color: p.symbol === 'CASH' ? '#10b981' : palette[idx % palette.length],
  }));

  const currentAllocationItems = [
    { label: 'AAPL', weight: 0.4, color: '#1e3a8a' },
    { label: 'MSFT', weight: 0.35, color: '#334155' },
    { label: 'NVDA', weight: 0.15, color: '#d97706' },
    { label: 'CASH', weight: 0.1, color: '#059669' },
  ];

  const selectedProposal = proposals.find((p) => p.id === selectedProposalId) || proposals[0];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Workspace Header */}
      <div className="border-b border-stone-200 pb-5">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-stone-500 uppercase tracking-normal">
              Quantitative Portfolio Builder &amp; Construction Studio
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 mt-1 font-normal tracking-tight">
              Portfolio Builder &amp; Proposal Fit
            </h1>
            <p className="text-sm text-stone-600 mt-1.5 max-w-3xl leading-relaxed">
              Create a proposal, adjust allocations, and compare how each change affects portfolio fit.
            </p>
          </div>

          {/* Sub-tab navigation */}
          <div className="flex rounded-xs border border-stone-300 bg-stone-100 p-0.5 text-xs font-medium">
            <button
              onClick={() => setActiveSubTab('builder')}
              className={`px-3 py-1.5 rounded-xs transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'builder'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Portfolio Builder</span>
            </button>
            <button
              onClick={() => setActiveSubTab('compare')}
              className={`px-3 py-1.5 rounded-xs transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'compare'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Current vs. Proposed</span>
            </button>
            <button
              onClick={() => setActiveSubTab('current')}
              className={`px-3 py-1.5 rounded-xs transition-colors ${
                activeSubTab === 'current'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Current Active Sleeve
            </button>
          </div>
        </div>

        {notification && (
          <div
            className={`mt-4 p-2.5 rounded-xs text-xs font-sans flex items-center gap-2 border ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : notification.type === 'warn'
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}
      </div>

      {/* SUB-WORKSPACE 1: Portfolio Builder */}
      {activeSubTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Saved Proposals Manager (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-stone-200 rounded-xs p-4 space-y-4 font-mono text-xs">
            <div className="flex justify-between items-center pb-2.5 border-b border-stone-200">
              <span className="font-semibold text-stone-900 text-xs font-sans">
                Saved Proposals ({proposals.length})
              </span>
              <button
                onClick={handleCreateNewBlank}
                className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-xs flex items-center gap-1 text-[11px] font-sans transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>New proposal</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {proposals.map((p) => {
                const isSelected = selectedProposalId === p.id;
                const evalMetrics = p.evaluation?.metrics;
                return (
                  <div
                    key={p.id}
                    onClick={() => loadProposalIntoEditor(p)}
                    className={`p-3 rounded-xs border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-stone-50 border-stone-900 border-l-4 shadow-2xs'
                        : 'bg-white border-stone-200 hover:bg-stone-50/70 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-stone-900">{p.id}</span>
                      <div className="flex items-center gap-1.5">
                        {p.isDraft ? (
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 bg-stone-100 text-stone-600 border border-stone-300 rounded-xs">
                            Draft
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xs">
                            Evaluated
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProposal(p.id, p.name);
                          }}
                          className="text-stone-400 hover:text-rose-700 transition-colors p-1 rounded-xs hover:bg-rose-50"
                          title={`Delete proposal "${p.name}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="font-medium text-stone-900 font-sans truncate">{p.name}</div>
                    <div className="text-[11px] text-stone-500 mt-1 font-sans">
                      {p.holdings.length} holdings · Return: {evalMetrics ? formatPercent(evalMetrics.expectedReturn, 1) : '—'} · Vol: {evalMetrics ? formatPercent(evalMetrics.volatility, 1) : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Allocation Builder & Real Engine Evaluation (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Proposal Details Form */}
            <div className="bg-white border border-stone-200 rounded-xs p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div className="flex-1 max-w-md">
                  <label className="text-[11px] font-mono text-stone-500 block mb-1">Proposal Title</label>
                  <input
                    type="text"
                    value={proposalName}
                    onChange={(e) => setProposalName(e.target.value)}
                    className="w-full text-base font-serif font-medium text-stone-900 border border-stone-300 rounded-xs px-2.5 py-1 focus:outline-hidden focus:border-stone-500"
                    placeholder="e.g. Core 4-Asset Growth Sleeve"
                  />
                </div>

                <div className="flex items-center gap-2 font-mono text-xs shrink-0 pt-2 sm:pt-0">
                  <button
                    onClick={handleDuplicate}
                    className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-xs flex items-center gap-1.5 transition-colors"
                    title="Duplicate proposal snapshot"
                  >
                    <Copy className="w-3.5 h-3.5 text-stone-500" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProposal(selectedProposalId, proposalName)}
                    className="px-3 py-1.5 bg-white border border-rose-300 hover:bg-rose-50 text-rose-800 rounded-xs flex items-center gap-1.5 transition-colors"
                    title="Delete proposal"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete</span>
                  </button>
                  <button
                    onClick={handleSaveProposal}
                    className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-xs flex items-center gap-1.5 font-semibold transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save proposal</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-stone-500 block mb-1">Investment Committee Rationale &amp; Methodology</label>
                <textarea
                  rows={2}
                  value={proposalDesc}
                  onChange={(e) => setProposalDesc(e.target.value)}
                  className="w-full text-xs font-sans text-stone-800 border border-stone-300 rounded-xs p-2.5 focus:outline-hidden focus:border-stone-500"
                  placeholder="Describe allocation methodology and research thesis..."
                />
              </div>

              {/* Position Allocation Table */}
              <div className="space-y-3">
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs font-semibold text-stone-900 font-sans">
                    Holdings &amp; Allocation Weights
                  </span>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-stone-500 font-sans">Total weight:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-xs border ${
                        isAllocationValid
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          : 'bg-rose-50 text-rose-900 border-rose-300'
                      }`}
                    >
                      {totalWeightPercent.toFixed(1)}% / 100.0%
                    </span>
                  </div>
                </div>

                <div className="border border-stone-200 rounded-xs overflow-hidden">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-500 text-[11px] bg-stone-50/50">
                        <th className="py-2.5 px-3 font-medium">Asset / Symbol</th>
                        <th className="py-2.5 px-3 font-medium">Sector</th>
                        <th className="py-2.5 px-3 font-medium text-right w-36">Weight (%)</th>
                        <th className="py-2.5 px-3 font-medium text-right">Value (${Math.round(totalCapital / 1000)}k)</th>
                        <th className="py-2.5 px-3 font-medium text-center w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-800">
                      {positions.map((pos) => {
                        const sec = universe.find((s) => s.symbol === pos.symbol);
                        const isCash = pos.symbol === 'CASH';
                        const sector = isCash ? 'Cash & Equivalents' : sec?.sector || 'Equity';
                        const dollarVal = (pos.weightPercent / 100) * totalCapital;

                        return (
                          <tr key={pos.symbol} className="hover:bg-stone-50/60 transition-colors">
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-stone-900">{pos.symbol}</span>
                              <span className="text-[11px] text-stone-500 ml-1.5 font-sans">
                                {isCash ? 'Cash & Short-Term Reserves' : sec?.name}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-stone-600 font-sans text-[11px]">{sector}</td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.5"
                                  value={pos.weightPercent}
                                  onChange={(e) => handleWeightChange(pos.symbol, e.target.value)}
                                  className="w-20 text-right py-1 px-2 border border-stone-300 rounded-xs font-bold text-stone-900 bg-white focus:outline-hidden focus:border-stone-500"
                                />
                                <span className="text-stone-500">%</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right text-stone-700 font-medium">
                              {formatCurrency(dollarVal, 0)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => handleRemovePosition(pos.symbol)}
                                className="text-stone-400 hover:text-rose-700 p-1 transition-colors"
                                title="Remove position"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Add Position from Universe or Cash */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs font-mono w-full sm:w-auto">
                    <span className="text-stone-600 font-sans shrink-0">Add candidate:</span>
                    <select
                      value={candidateToAdd}
                      onChange={(e) => setCandidateToAdd(e.target.value)}
                      className="bg-stone-50 border border-stone-300 rounded-xs px-2.5 py-1.5 text-stone-900 text-xs focus:outline-hidden focus:bg-white font-sans flex-1"
                    >
                      <option value="CASH">CASH (Risk-Free Buffer @ 4.5%)</option>
                      {universe.map((s) => (
                        <option key={s.symbol} value={s.symbol}>
                          {s.symbol} — {s.name} ({s.sector})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleAddPosition}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xs text-xs font-mono flex items-center gap-1.5 transition-colors w-full sm:w-auto justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add position</span>
                  </button>
                </div>
              </div>

              {/* Allocation Bar Chart */}
              {positions.length > 0 && (
                <div className="pt-2">
                  <span className="text-[11px] font-mono text-stone-500 block mb-2">Visual Weight Distribution</span>
                  <AllocationBarChart items={chartItems} />
                </div>
              )}
            </div>

            {/* Model Evaluation Strip */}
            <div className="bg-white border border-stone-200 rounded-xs p-5 space-y-4 font-mono text-xs">
              <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                <span className="font-semibold text-stone-900 font-sans text-xs">
                  Quantitative Engine Real-Time Evaluation
                </span>
                <span
                  className={`px-2 py-0.5 rounded-xs font-semibold uppercase text-[10px] border ${
                    liveEvaluation.isValid
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : 'bg-amber-50 text-amber-900 border-amber-300'
                  }`}
                >
                  {liveEvaluation.isValid ? 'Valid 100% Allocation' : 'Incomplete / Invalid Total'}
                </span>
              </div>

              {liveEvaluation.isValid ? (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="border-l-2 border-stone-300 pl-3">
                      <span className="text-stone-500 block text-[11px] font-sans">Expected Return</span>
                      <span className="text-base font-semibold text-emerald-800 block mt-0.5">
                        {formatPercent(liveEvaluation.metrics.expectedReturn)}
                      </span>
                      <span className="text-[10px] text-stone-500 font-sans">Model w^T*mu</span>
                    </div>

                    <div className="border-l-2 border-stone-300 pl-3">
                      <span className="text-stone-500 block text-[11px] font-sans">Annual Volatility</span>
                      <span className="text-base font-semibold text-stone-900 block mt-0.5">
                        {formatPercent(liveEvaluation.metrics.volatility)}
                      </span>
                      <span className="text-[10px] text-stone-500 font-sans">sqrt(w^T*Cov*w)</span>
                    </div>

                    <div className="border-l-2 border-stone-300 pl-3">
                      <span className="text-stone-500 block text-[11px] font-sans">Sharpe Ratio</span>
                      <span className="text-base font-semibold text-stone-900 block mt-0.5">
                        {formatNumber(liveEvaluation.metrics.sharpeRatio)}
                      </span>
                      <span className="text-[10px] text-stone-500 font-sans">Rf = 4.5%</span>
                    </div>

                    <div className="border-l-2 border-stone-300 pl-3">
                      <span className="text-stone-500 block text-[11px] font-sans">Portfolio Beta</span>
                      <span className="text-base font-semibold text-stone-900 block mt-0.5">
                        {formatNumber(liveEvaluation.metrics.betaSPY)}x
                      </span>
                      <span className="text-[10px] text-stone-500 font-sans">vs SPY benchmark</span>
                    </div>

                    <div className="border-l-2 border-stone-300 pl-3">
                      <span className="text-stone-500 block text-[11px] font-sans">1-Month VaR 95%</span>
                      <span className="text-base font-semibold text-stone-900 block mt-0.5">
                        {formatPercent(liveEvaluation.metrics.var95Monthly)}
                      </span>
                      <span className="text-[10px] text-stone-500 font-sans">Parametric loss</span>
                    </div>

                    <div className="border-l-2 border-stone-300 pl-3">
                      <span className="text-stone-500 block text-[11px] font-sans">Top 2 Concentration</span>
                      <span className="text-base font-semibold text-stone-900 block mt-0.5">
                        {formatPercent(liveEvaluation.metrics.topHoldingsConcentration)}
                      </span>
                      <span className="text-[10px] text-stone-500 font-sans">HHI: {formatNumber(liveEvaluation.metrics.herfindahlIndex, 3)}</span>
                    </div>
                  </div>

                  {liveEvaluation.warnings.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-stone-100 text-stone-600 font-sans text-xs space-y-1">
                      {liveEvaluation.warnings.map((w, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-amber-800">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-stone-500 font-sans text-xs bg-stone-50 p-4 rounded-xs border border-stone-200">
                  {liveEvaluation.validationError || 'Weights must sum to 100.0% to compute quantitative portfolio metrics.'}
                </div>
              )}
            </div>

            {/* Quick Action to Review */}
            <div className="flex justify-end font-mono text-xs">
              <button
                onClick={() => onSelectProposalForReview(selectedProposalId)}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-xs flex items-center gap-2 font-medium transition-colors"
              >
                <span>Select this proposal for CIO review &amp; risk memorandum</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-WORKSPACE 2: Side-by-Side Comparison (Current vs Proposed) */}
      {activeSubTab === 'compare' && (
        <div className="space-y-6">
          <div className="bg-white border border-stone-200 rounded-xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
            <div>
              <span className="text-stone-900 font-semibold text-sm font-sans block">
                Structured Differential Matrix: Current Portfolio vs. {selectedProposal.name}
              </span>
              <p className="text-stone-600 font-sans text-xs mt-1">
                Compares factor exposures, expected compounding return, volatility covariance offset, and concentration metrics.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-stone-500 font-sans">Comparing proposal:</span>
              <select
                value={selectedProposalId}
                onChange={(e) => handleSelectProposal(e.target.value)}
                className="bg-stone-50 border border-stone-300 rounded-xs px-2.5 py-1 text-stone-900 text-xs font-sans"
              >
                {proposals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Differential Table */}
          <div className="bg-white border border-stone-200 rounded-xs overflow-hidden">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 text-[11px] bg-stone-50/50">
                  <th className="py-3 px-4 font-medium">Analytical Metric</th>
                  <th className="py-3 px-3 font-medium text-right">Current Active Sleeve</th>
                  <th className="py-3 px-3 font-medium text-right">Proposed Sleeve ({selectedProposal.id})</th>
                  <th className="py-3 px-3 font-medium text-right">Net Delta</th>
                  <th className="py-3 px-4 font-medium">Fiduciary Interpretation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {(() => {
                  const propMetrics = selectedProposal.evaluation?.metrics || CURRENT_PORTFOLIO_METRICS;
                  const cur = CURRENT_PORTFOLIO_METRICS;

                  const rows = [
                    {
                      label: 'Expected Return (Annualized)',
                      curVal: formatPercent(cur.expectedReturn),
                      propVal: formatPercent(propMetrics.expectedReturn),
                      delta: propMetrics.expectedReturn - cur.expectedReturn,
                      format: (d: number) => formatDelta(d, true).text,
                      interpretation:
                        propMetrics.expectedReturn > cur.expectedReturn
                          ? 'Higher annual gross capital accumulation pace.'
                          : 'Slightly lower gross return in exchange for risk reduction.',
                    },
                    {
                      label: 'Annualized Volatility (σ)',
                      curVal: formatPercent(cur.volatility),
                      propVal: formatPercent(propMetrics.volatility),
                      delta: propMetrics.volatility - cur.volatility,
                      format: (d: number) => formatDelta(d, true).text,
                      interpretation:
                        propMetrics.volatility < cur.volatility
                          ? 'Lower volatility due to diversification offset.'
                          : 'Elevated volatility requires higher risk tolerance.',
                    },
                    {
                      label: 'Sharpe Ratio (Rf = 4.5%)',
                      curVal: formatNumber(cur.sharpeRatio),
                      propVal: formatNumber(propMetrics.sharpeRatio),
                      delta: propMetrics.sharpeRatio - cur.sharpeRatio,
                      format: (d: number) => formatDelta(d, false).text,
                      interpretation:
                        propMetrics.sharpeRatio > cur.sharpeRatio
                          ? 'Superior excess return generated per unit of total risk.'
                          : 'Moderate risk-adjusted efficiency trade-off.',
                    },
                    {
                      label: 'Market Beta (vs SPY)',
                      curVal: `${formatNumber(cur.betaSPY)}x`,
                      propVal: `${formatNumber(propMetrics.betaSPY)}x`,
                      delta: propMetrics.betaSPY - cur.betaSPY,
                      format: (d: number) => `${formatDelta(d, false).text}x`,
                      interpretation:
                        propMetrics.betaSPY > cur.betaSPY
                          ? 'Higher market sensitivity during broader equity rallies and drawdowns.'
                          : 'More defensive stance relative to benchmark fluctuations.',
                    },
                    {
                      label: 'Monthly 95% Parametric VaR',
                      curVal: formatPercent(cur.var95Monthly),
                      propVal: formatPercent(propMetrics.var95Monthly),
                      delta: propMetrics.var95Monthly - cur.var95Monthly,
                      format: (d: number) => formatDelta(d, true).text,
                      interpretation: '1-month 95% worst-case loss ceiling under normal distribution.',
                    },
                    {
                      label: 'Top 2 Holdings Concentration',
                      curVal: formatPercent(cur.topHoldingsConcentration),
                      propVal: formatPercent(propMetrics.topHoldingsConcentration),
                      delta: propMetrics.topHoldingsConcentration - cur.topHoldingsConcentration,
                      format: (d: number) => formatDelta(d, true).text,
                      interpretation:
                        propMetrics.topHoldingsConcentration < cur.topHoldingsConcentration
                          ? 'Reduced single-stock idiosyncratic exposure.'
                          : 'Concentrated exposure in top conviction assets.',
                    },
                  ];

                  return rows.map((r, i) => (
                    <tr key={i} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3 px-4 font-sans font-medium text-stone-900">{r.label}</td>
                      <td className="py-3 px-3 text-right text-stone-700">{r.curVal}</td>
                      <td className="py-3 px-3 text-right font-bold text-stone-900">{r.propVal}</td>
                      <td
                        className={`py-3 px-3 text-right font-bold ${
                          r.delta > 0 && r.label.includes('Return')
                            ? 'text-emerald-800'
                            : r.delta < 0 && r.label.includes('Volatility')
                            ? 'text-emerald-800'
                            : r.delta < 0
                            ? 'text-rose-800'
                            : 'text-stone-900'
                        }`}
                      >
                        {r.format(r.delta)}
                      </td>
                      <td className="py-3 px-4 text-stone-600 font-sans text-[11px]">{r.interpretation}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>

          {/* Side-by-Side Allocation Distribution Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-stone-200 rounded-xs p-5 space-y-3">
              <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                <span className="font-semibold text-stone-900 font-sans text-xs">
                  Current Active Baseline Structure
                </span>
                <span className="text-[11px] text-stone-500 font-mono">4-Asset Baseline</span>
              </div>
              <AllocationBarChart items={currentAllocationItems} totalCapital={totalCapital} />
            </div>

            <div className="bg-white border border-stone-200 rounded-xs p-5 space-y-3">
              <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                <span className="font-semibold text-stone-900 font-sans text-xs">
                  {selectedProposal.name}
                </span>
                <span className="text-[11px] text-stone-500 font-mono">
                  {selectedProposal.id} Target
                </span>
              </div>
              <AllocationBarChart
                items={selectedProposal.holdings.map((h, idx) => ({
                  label: h.symbol,
                  weight: h.weight,
                  color: h.symbol === 'CASH' ? '#10b981' : palette[idx % palette.length],
                }))}
                totalCapital={totalCapital}
              />
            </div>
          </div>
        </div>
      )}

      {/* SUB-WORKSPACE 3: Current Portfolio Baseline */}
      {activeSubTab === 'current' && (
        <div className="space-y-6">
          <div className="bg-white border border-stone-200 rounded-xs p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h2 className="text-sm font-semibold text-stone-900 font-sans">
                Active sleeve baseline distribution
              </h2>
              <span className="text-xs text-stone-500 font-mono">Core sleeve target weights</span>
            </div>
            <AllocationBarChart items={currentAllocationItems} totalCapital={totalCapital} />
          </div>

          {/* Multi-Year Compounding Trajectory & Liability Reserve Ground Zero */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-stone-900 font-sans">
                Compounding Trajectory ({profile.name})
              </span>
              <span className="text-xs font-mono text-stone-500">
                Beg-{profile.facts.operatingStartYear.value} Reserve PV: {formatCurrency(derivedCase.reserveSpec.reservePVBeginning2033, 0)}
              </span>
            </div>
            <TrajectoryInteractiveChart
              schedule={derivedCase.trajectorySchedule}
              reserveSpec={derivedCase.reserveSpec}
              height={280}
            />
          </div>

          <div className="bg-white border border-stone-200 rounded-xs overflow-hidden">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 text-[11px] bg-stone-50/50">
                  <th className="py-3 px-4 font-medium">Holding</th>
                  <th className="py-3 px-3 font-medium">Sector</th>
                  <th className="py-3 px-3 font-medium text-right">Target weight</th>
                  <th className="py-3 px-3 font-medium text-right">Current value</th>
                  <th className="py-3 px-4 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {CURRENT_PORTFOLIO_HOLDINGS.map((h) => (
                  <tr key={h.symbol} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900">{h.symbol}</div>
                      <div className="text-[11px] text-stone-500 font-sans">{h.name}</div>
                    </td>
                    <td className="py-3 px-3 text-stone-600">{h.sector}</td>
                    <td className="py-3 px-3 text-right font-bold text-stone-900">
                      {formatPercent(h.weight)}
                    </td>
                    <td className="py-3 px-3 text-right text-stone-600 font-medium">
                      {formatCurrency(h.currentValue, 0)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {h.symbol !== 'CASH' && (
                        <button
                          onClick={() => onSelectSecurity(h.symbol)}
                          className="px-2.5 py-1 rounded-xs bg-white hover:bg-stone-100 text-stone-700 hover:text-stone-900 border border-stone-300 transition-colors text-[11px]"
                        >
                          Inspect dossier
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
