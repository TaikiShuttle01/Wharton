/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Contextual Security Provenance & Evidence Drawer (Editorial Light System)
 */

import React from 'react';
import { SecurityRecord } from '../../types/quantTypes';
import { StatusBadge } from './StatusBadge';
import { X, ShieldCheck, Database, CheckCircle2, ArrowRight } from 'lucide-react';

interface DataProvenanceDrawerProps {
  security: SecurityRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DataProvenanceDrawer: React.FC<DataProvenanceDrawerProps> = ({
  security,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !security) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-xl bg-white border-l border-stone-200 text-stone-900 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 font-sans">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-stone-700" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold font-mono text-stone-900">
                  {security.symbol} Provenance &amp; Evidence Audit
                </h3>
                <StatusBadge state={security.dataReadiness} />
              </div>
              <p className="text-xs text-stone-500 font-sans">{security.name} · {security.sector}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-900 rounded-xs hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-xs">
          {/* Trust Banner */}
          <div className="p-3.5 rounded-xs border border-stone-200 bg-stone-50 text-stone-800 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-stone-900 text-xs">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <span>Data trust and provenance invariant</span>
            </div>
            <p className="leading-relaxed text-stone-600 text-xs">
              The Wharton Growth Sleeve model strictly separates raw provider evidence from model-selected inputs.
              Disagreements are retained for analyst inspection and are never averaged or silently substituted.
            </p>
          </div>

          {/* Verification & Identity Metadata */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono">
              Identity &amp; Regulatory Provenance
            </h4>
            <div className="grid grid-cols-2 gap-3 bg-stone-50 p-4 rounded-xs border border-stone-200 font-mono">
              <div>
                <span className="text-stone-500 block text-[11px] font-sans">Trading Exchange</span>
                <span className="font-semibold text-stone-900 mt-1 block">
                  {security.exchange}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block text-[11px] font-sans">Asset classification</span>
                <span className="font-semibold text-stone-900 mt-1 block">
                  {security.assetType} ({security.currency})
                </span>
              </div>
              <div>
                <span className="text-stone-500 block text-[11px] font-sans">Primary provider</span>
                <span className="font-semibold text-stone-900 mt-1 block">
                  {security.provenance.primaryProvider}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block text-[11px] font-sans">SEC CIK identifier</span>
                <span className="font-semibold text-stone-900 mt-1 block">
                  {security.provenance.secCik || 'N/A (Index/ETF)'}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block text-[11px] font-sans">Ingestion timestamp</span>
                <span className="text-stone-700 mt-1 block">
                  {security.provenance.lastIngestionTimestamp}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block text-[11px] font-sans">Payload SHA-256 hash</span>
                <span className="text-stone-800 mt-1 block truncate" title={security.provenance.rawPayloadHash}>
                  {security.provenance.rawPayloadHash.slice(0, 16)}...
                </span>
              </div>
            </div>
          </div>

          {/* Discrepancies & Selection Rules */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono flex items-center justify-between">
              <span>Multi-provider disagreements</span>
              <span className="text-stone-500 font-normal">
                {security.disagreements.length === 0 ? 'None (Full agreement)' : `${security.disagreements.length} logged`}
              </span>
            </h4>

            {security.disagreements.length === 0 ? (
              <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 text-stone-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>All providers in cross-vendor agreement on reported fundamental ratios.</span>
              </div>
            ) : (
              security.disagreements.map((dis, idx) => (
                <div key={idx} className="p-3.5 rounded-xs border border-amber-200 bg-amber-50/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-900 font-sans">{dis.metricLabel}</span>
                    <span className="px-2 py-0.5 rounded-xs bg-amber-100 text-amber-900 font-mono text-[10px] font-semibold">
                      Δ {(dis.deltaPercent * 100).toFixed(2)}%
                    </span>
                  </div>

                  <div className="space-y-1.5 border-y border-amber-200 py-2 font-mono">
                    {dis.providerValues.map((pv, pIdx) => (
                      <div key={pIdx} className="flex justify-between items-center text-stone-700">
                        <span className="text-stone-500">{pv.provider}:</span>
                        <span className="font-semibold text-stone-900">{pv.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 text-stone-700">
                    <div className="flex items-center gap-1.5 font-semibold text-stone-900 font-mono text-[11px]">
                      <ArrowRight className="w-3.5 h-3.5" />
                      Precedence rule: {dis.selectionRule}
                    </div>
                    <div className="text-stone-600 leading-normal">{dis.explanation}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Screening Evaluation Audit */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono">
              Quantitative screening evaluation audit
            </h4>
            <div className="space-y-2">
              {security.screeningResults.map((scr) => (
                <div
                  key={scr.ruleId}
                  className="p-3 rounded-xs bg-stone-50 border border-stone-200 flex items-start justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 font-medium text-stone-900">
                      <span>{scr.name}</span>
                      <span className="text-[10px] text-stone-500 font-mono">({scr.category})</span>
                    </div>
                    <div className="text-stone-600 text-[11px] font-mono">
                      Target: {scr.operator} {scr.thresholdLabel} · Actual: {scr.actualLabel}
                    </div>
                    <p className="text-stone-500 text-[11px] leading-relaxed pt-0.5">{scr.commentary}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-xs text-[10px] font-mono uppercase font-semibold border ${
                      scr.passed
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                    }`}
                  >
                    {scr.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
