/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Security Research, Discovery & Universe Manager (Editorial Workspace)
 */

import React, { useState, useEffect } from 'react';
import { SecurityRecord } from '../../types/quantTypes';
import { lookupSecurity, SecurityLookupResult } from '../../data/securityLookup';
import {
  loadSavedUniverse,
  addSecurityToUniverse,
  removeSecurityFromUniverse,
} from '../../data/userStorage';
import {
  formatCurrency,
  formatPercent,
  formatRatio,
  formatNumber,
  formatLargeNumber,
} from '../../utils/formatters';
import { StatusBadge, FundamentalBadge } from '../layout/StatusBadge';
import { FinancialTimeSeriesChart } from '../common/Charts';
import { UNIVERSE_SECURITIES } from '../../data/quantModelData';
import { CaseProfile } from '../../types/caseTypes';
import { getActiveCaseProfile } from '../../data/caseStorage';
import {
  Search,
  Plus,
  Trash2,
  ExternalLink,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building2,
  BookmarkCheck,
  ShieldCheck,
  Sliders,
} from 'lucide-react';

interface ResearchViewProps {
  selectedSymbol: string;
  activeProfile?: CaseProfile;
  onSelectSecurity: (symbol: string) => void;
  onOpenProvenance: (symbol: string) => void;
  onTestPortfolioFit: (symbol: string) => void;
}

export const ResearchView: React.FC<ResearchViewProps> = ({
  selectedSymbol,
  activeProfile: propProfile,
  onSelectSecurity,
  onOpenProvenance,
  onTestPortfolioFit,
}) => {
  const profile = propProfile || getActiveCaseProfile();
  // Saved universe state from browser storage
  const [universe, setUniverse] = useState<SecurityRecord[]>([]);
  const [filterQuery, setFilterQuery] = useState('');

  // Lookup state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [lookupResult, setLookupResult] = useState<SecurityLookupResult | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'warn' | 'error' } | null>(null);

  useEffect(() => {
    setUniverse(loadSavedUniverse());
  }, []);

  const triggerNotify = (message: string, type: 'success' | 'warn' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setLookupResult(null);
    try {
      const res = await lookupSecurity(searchQuery);
      setLookupResult(res);
    } catch (err) {
      setLookupResult({
        status: 'LOOKUP_ERROR',
        query: searchQuery,
        matches: [],
        provider: 'Gateway',
        timestamp: new Date().toISOString(),
        errorMessage: 'Network or provider request failed.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToUniverse = (sec: SecurityRecord) => {
    const res = addSecurityToUniverse(sec);
    if (res.success) {
      setUniverse(loadSavedUniverse());
      onSelectSecurity(sec.symbol);
      triggerNotify(`Added ${sec.symbol} to your saved research universe.`, 'success');
    } else {
      triggerNotify(res.error || 'Failed to add security.', 'warn');
    }
  };

  const handleRemoveFromUniverse = (symbol: string) => {
    const res = removeSecurityFromUniverse(symbol);
    if (res.success) {
      const updated = loadSavedUniverse();
      setUniverse(updated);
      if (selectedSymbol === symbol && updated.length > 0) {
        onSelectSecurity(updated[0].symbol);
      }
      if (res.proposalsAffected.length > 0) {
        triggerNotify(
          `Removed ${symbol}. Note: proposals [${res.proposalsAffected.join(', ')}] reference this symbol.`,
          'warn'
        );
      } else {
        triggerNotify(`Removed ${symbol} from research universe.`, 'success');
      }
    }
  };

  // Selected security
  const currentSecurity =
    universe.find((s) => s.symbol === selectedSymbol) ||
    universe[0] ||
    lookupResult?.matches[0];

  const filteredUniverse = universe.filter(
    (s) =>
      s.symbol.toLowerCase().includes(filterQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      s.sector.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Workspace Editorial Title */}
      <div className="border-b border-stone-200 pb-5">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-stone-500 uppercase tracking-normal">
              Universe Discovery, Security Dossiers &amp; GAAP Fundamentals
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 mt-1 font-normal tracking-tight">
              Security Research &amp; Universe Manager
            </h1>
            <p className="text-sm text-stone-600 mt-1.5 max-w-3xl leading-relaxed">
              Search for securities, inspect data quality and sources, then save candidates worth evaluating.
            </p>

            {/* Mandate Policy Screening Criteria Strip */}
            <div className="mt-3 flex items-center gap-3 text-xs font-mono text-stone-600 flex-wrap">
              <span className="text-stone-500 font-sans">Active Case Constraints:</span>
              <span className="px-2 py-0.5 bg-stone-100 text-stone-800 rounded-xs border border-stone-200">
                Max Weight: {(profile.policies.maxSinglePositionWeight * 100).toFixed(0)}%
              </span>
              <span className="px-2 py-0.5 bg-stone-100 text-stone-800 rounded-xs border border-stone-200">
                Min WInS Verified: {(profile.policies.minWinsVerificationThreshold * 100).toFixed(0)}%
              </span>
              <span className="px-2 py-0.5 bg-stone-100 text-stone-800 rounded-xs border border-stone-200">
                Cash Bounds: {(profile.policies.minCashAllocation * 100).toFixed(0)}%–{(profile.policies.maxCashAllocation * 100).toFixed(0)}%
              </span>
              {profile.policies.esgNegativeScreening && (
                <span className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded-xs border border-stone-200 truncate max-w-xs" title={profile.policies.esgNegativeScreening}>
                  ESG: {profile.policies.esgNegativeScreening}
                </span>
              )}
            </div>
          </div>

          {currentSecurity && (
            <div className="flex items-center gap-2 font-mono text-xs shrink-0">
              <button
                onClick={() => onTestPortfolioFit(currentSecurity.symbol)}
                className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <span>Add to builder ({currentSecurity.symbol})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onOpenProvenance(currentSecurity.symbol)}
                className="px-3.5 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <Database className="w-3.5 h-3.5 text-stone-500" />
                <span>Provenance</span>
              </button>
            </div>
          )}
        </div>

        {/* Transient Notifications */}
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

      {/* 1. Global Security Lookup Bar */}
      <div className="bg-white border border-stone-200 rounded-xs p-4">
        <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by symbol, company name, or CIK (e.g., GOOGL, META, TSLA, Apple)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xs text-stone-900 text-xs placeholder:text-stone-400 focus:outline-hidden focus:bg-white focus:border-stone-500 font-sans"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-400 text-stone-50 text-xs font-medium rounded-xs transition-colors flex items-center justify-center gap-2 shrink-0 font-mono"
          >
            {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>{isSearching ? 'Querying providers...' : 'Lookup security'}</span>
          </button>
        </form>

        {/* Lookup Results Display */}
        {lookupResult && (
          <div className="mt-4 pt-4 border-t border-stone-100">
            <div className="flex items-center justify-between text-xs mb-3">
              <div className="flex items-center gap-2 font-mono">
                <span className="text-stone-500">Lookup state:</span>
                <span
                  className={`px-2 py-0.5 rounded-xs font-semibold uppercase text-[11px] border ${
                    lookupResult.status === 'FOUND'
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : lookupResult.status === 'UNVERIFIED'
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : lookupResult.status === 'NOT_FOUND'
                      ? 'bg-stone-100 text-stone-700 border-stone-300'
                      : 'bg-rose-50 text-rose-900 border-rose-300'
                  }`}
                >
                  {lookupResult.status}
                </span>
                <span className="text-stone-400">·</span>
                <span className="text-stone-500 font-sans">Provider: {lookupResult.provider}</span>
              </div>
            </div>

            {lookupResult.status === 'FOUND' && lookupResult.matches.length > 0 && (
              <div className="space-y-2">
                {lookupResult.matches.map((m) => {
                  const isSaved = universe.some((s) => s.symbol === m.symbol);
                  return (
                    <div
                      key={m.symbol}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-stone-50 border border-stone-200 rounded-xs gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-stone-900">{m.symbol}</span>
                          <span className="font-medium text-stone-800">{m.name}</span>
                          <span className="text-[11px] text-stone-500 font-mono">({m.exchange})</span>
                          <StatusBadge state={m.dataReadiness} />
                        </div>
                        <div className="text-[11px] text-stone-500 mt-1 font-mono">
                          {m.sector} · Price: {formatCurrency(m.currentPrice)} · Return: {formatPercent(m.metrics.annualizedReturn)} · Vol: {formatPercent(m.metrics.annualizedVolatility)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isSaved ? (
                          <span className="text-emerald-800 flex items-center gap-1 font-medium font-sans text-xs">
                            <BookmarkCheck className="w-4 h-4 text-emerald-700" />
                            In universe
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAddToUniverse(m)}
                            className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-xs font-mono text-xs flex items-center gap-1.5 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Save to universe</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            onSelectSecurity(m.symbol);
                          }}
                          className="px-2.5 py-1.5 bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 rounded-xs font-mono text-xs transition-colors"
                        >
                          Inspect
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {lookupResult.status === 'NOT_FOUND' && (
              <div className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xs border border-stone-200 font-sans">
                {lookupResult.warning || `No security matched query "${lookupResult.query}".`}
              </div>
            )}

            {lookupResult.status === 'LOOKUP_ERROR' && (
              <div className="text-xs text-rose-800 bg-rose-50 p-3 rounded-xs border border-rose-200 font-sans">
                {lookupResult.errorMessage || 'Operational error occurred during provider query.'}
              </div>
            )}

            {lookupResult.status === 'UNVERIFIED' && (
              <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xs border border-amber-200 font-sans">
                {lookupResult.warning}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Master / Detail Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT MASTER LIST: Saved Research Universe (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-stone-200 rounded-xs p-4 space-y-3 font-mono text-xs">
          <div className="flex justify-between items-center pb-2.5 border-b border-stone-200">
            <span className="font-semibold text-stone-900 text-xs font-sans">
              Personal Research Universe ({universe.length})
            </span>
            <span className="text-[11px] text-stone-500 font-mono">Persistent</span>
          </div>

          {/* Universe Filter Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter saved instruments..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xs text-stone-800 text-xs placeholder:text-stone-400 focus:outline-hidden focus:border-stone-400 focus:bg-white font-sans transition-colors"
            />
          </div>

          {/* List of Saved Securities */}
          <div className="divide-y divide-stone-100 max-h-[580px] overflow-y-auto pr-1">
            {filteredUniverse.map((s) => {
              const isSelected = currentSecurity?.symbol === s.symbol;
              return (
                <div
                  key={s.symbol}
                  onClick={() => onSelectSecurity(s.symbol)}
                  className={`p-3 rounded-xs cursor-pointer transition-all border my-1 ${
                    isSelected
                      ? 'bg-stone-50 border-stone-900 border-l-4 shadow-2xs'
                      : 'bg-white border-transparent hover:bg-stone-50 hover:border-stone-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="font-bold text-stone-900 text-xs">{s.symbol}</span>
                      <span className="text-[11px] text-stone-500 ml-1.5 font-sans font-normal truncate max-w-[140px] inline-block align-bottom">
                        {s.name}
                      </span>
                    </div>
                    <StatusBadge state={s.dataReadiness} />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-stone-600 mt-2">
                    <span className="font-bold text-stone-900">{formatCurrency(s.currentPrice)}</span>
                    <span>Ret: {formatPercent(s.metrics.annualizedReturn, 1)}</span>
                    <span>Vol: {formatPercent(s.metrics.annualizedVolatility, 1)}</span>
                  </div>

                  <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-stone-100 text-[10px] text-stone-500 font-sans">
                    <span>{s.sector}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFromUniverse(s.symbol);
                      }}
                      className="text-stone-400 hover:text-rose-700 transition-colors p-0.5"
                      title={`Remove ${s.symbol} from saved universe`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredUniverse.length === 0 && (
              <div className="py-8 text-center text-stone-500 font-sans text-xs">
                No saved securities matched. Use the search bar above to look up instruments.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT DETAIL PANE: Comprehensive Dossier (8 cols) */}
        {currentSecurity ? (
          <div className="lg:col-span-8 space-y-6">
            {/* Header Card */}
            <div className="bg-white border border-stone-200 rounded-xs p-6 space-y-4 font-mono text-xs">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-stone-100 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-2xl font-serif text-stone-900 font-normal tracking-tight">
                      {currentSecurity.name}
                    </h2>
                    <span className="text-base font-mono font-bold text-stone-700">
                      ({currentSecurity.symbol})
                    </span>
                    <StatusBadge state={currentSecurity.dataReadiness} />
                  </div>
                  <div className="text-xs text-stone-500 font-sans mt-1">
                    {currentSecurity.sector} · {currentSecurity.industry} · {currentSecurity.exchange} ({currentSecurity.currency})
                  </div>
                </div>

                <div className="sm:text-right">
                  <div className="text-2xl font-bold text-stone-900">
                    {formatCurrency(currentSecurity.currentPrice)}
                  </div>
                  <span className="text-[11px] text-stone-500">
                    As of {currentSecurity.priceDate} · {currentSecurity.provenance.primaryProvider}
                  </span>
                </div>
              </div>

              {/* Security Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="border-l-2 border-stone-300 pl-3">
                  <span className="text-stone-500 block text-[11px] font-sans">Annualized Return</span>
                  <span className="text-base font-semibold text-emerald-800 block mt-0.5">
                    {formatPercent(currentSecurity.metrics.annualizedReturn)}
                  </span>
                  <span className="text-[10px] text-stone-500 font-sans">5-yr sample CAGR</span>
                </div>

                <div className="border-l-2 border-stone-300 pl-3">
                  <span className="text-stone-500 block text-[11px] font-sans">Annual Volatility</span>
                  <span className="text-base font-semibold text-stone-900 block mt-0.5">
                    {formatPercent(currentSecurity.metrics.annualizedVolatility)}
                  </span>
                  <span className="text-[10px] text-stone-500 font-sans">5-yr monthly σ</span>
                </div>

                <div className="border-l-2 border-stone-300 pl-3">
                  <span className="text-stone-500 block text-[11px] font-sans">Sharpe Ratio</span>
                  <span className="text-base font-semibold text-stone-900 block mt-0.5">
                    {formatNumber(currentSecurity.metrics.sharpeRatio)}
                  </span>
                  <span className="text-[10px] text-stone-500 font-sans">Rf = 4.5%</span>
                </div>

                <div className="border-l-2 border-stone-300 pl-3">
                  <span className="text-stone-500 block text-[11px] font-sans">Market Beta (SPY)</span>
                  <span className="text-base font-semibold text-stone-900 block mt-0.5">
                    {formatNumber(currentSecurity.metrics.betaSPY)}x
                  </span>
                  <span className="text-[10px] text-stone-500 font-sans">Benchmark slope</span>
                </div>
              </div>
            </div>

            {/* Institutional Financial Time-Series Chart */}
            {(() => {
              const spyBenchmark =
                universe.find((s) => s.symbol === 'SPY') ||
                UNIVERSE_SECURITIES.find((s) => s.symbol === 'SPY');

              return (
                <FinancialTimeSeriesChart
                  data={currentSecurity.priceHistory}
                  symbol={currentSecurity.symbol}
                  title={currentSecurity.name}
                  benchmarkData={currentSecurity.symbol !== 'SPY' ? spyBenchmark?.priceHistory : undefined}
                  benchmarkSymbol="SPY"
                  height={480}
                />
              );
            })()}

            {/* Audited Fundamentals Table */}
            <div className="bg-white border border-stone-200 rounded-xs p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                <span className="font-semibold text-stone-900 font-sans text-xs">
                  Audited GAAP &amp; Financial Accounting Metrics
                </span>
                <span className="text-xs text-stone-500 font-mono">
                  SEC EDGAR XBRL + FMP Provider Resolution
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500 text-[11px] bg-stone-50/50">
                      <th className="py-2.5 px-3 font-medium">Metric</th>
                      <th className="py-2.5 px-3 font-medium text-right">Value</th>
                      <th className="py-2.5 px-3 font-medium text-center">Data classification</th>
                      <th className="py-2.5 px-3 font-medium">Source / Period</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-800">
                    {currentSecurity.fundamentals.map((f) => (
                      <tr key={f.key} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-sans font-medium text-stone-900">{f.label}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-stone-900">
                          {f.key === 'mktCap'
                            ? formatLargeNumber(f.value)
                            : f.unit === '%'
                            ? formatPercent(f.value)
                            : f.unit === 'x'
                            ? formatRatio(f.value)
                            : formatNumber(f.value)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <FundamentalBadge classification={f.classification} />
                        </td>
                        <td className="py-2.5 px-3 text-stone-600">
                          {f.provider} · <span className="text-stone-500">{f.period}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quantitative Screening Rules Pass / Fail */}
            {currentSecurity.screeningResults && currentSecurity.screeningResults.length > 0 && (
              <div className="bg-white border border-stone-200 rounded-xs p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                  <span className="font-semibold text-stone-900 font-sans text-xs">
                    Deterministic Screening Criteria Rules
                  </span>
                  <span
                    className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-xs border ${
                      currentSecurity.overallScreeningPass
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        : 'bg-amber-50 text-amber-900 border-amber-300'
                    }`}
                  >
                    {currentSecurity.overallScreeningPass ? 'PASSED MANDATE SCREEN' : 'PARTIAL / CONDITIONAL'}
                  </span>
                </div>

                <div className="space-y-2">
                  {currentSecurity.screeningResults.map((r) => (
                    <div
                      key={r.ruleId}
                      className="p-3 rounded-xs border border-stone-200 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-stone-900">{r.ruleId}</span>
                          <span className="font-medium text-stone-800 font-sans">{r.name}</span>
                        </div>
                        <p className="text-[11px] text-stone-500 font-sans mt-0.5">{r.commentary}</p>
                      </div>

                      <div className="flex items-center gap-3 font-mono shrink-0">
                        <span className="text-stone-600">
                          Actual: <strong className="text-stone-900">{r.actualLabel}</strong> (Req: {r.thresholdLabel})
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-xs font-semibold uppercase text-[10px] border ${
                            r.passed
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : 'bg-rose-50 text-rose-900 border-rose-300'
                          }`}
                        >
                          {r.passed ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-8 bg-white border border-stone-200 rounded-xs p-12 text-center text-stone-500 font-sans text-xs">
            Select a security on the left or use the lookup bar above to explore candidate dossiers.
          </div>
        )}
      </div>
    </div>
  );
};
