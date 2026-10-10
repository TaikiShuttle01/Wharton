/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Wharton Global High School Investment Competition - Quantitative Growth Sleeve
 * User-Defined Growth Sleeve Research & Portfolio Builder
 */

import React, { useState } from 'react';
import { OverviewView } from './components/views/OverviewView';
import { CaseSetupView } from './components/views/CaseSetupView';
import { ResearchView } from './components/views/ResearchView';
import { PortfolioView } from './components/views/PortfolioView';
import { DecisionView } from './components/views/DecisionView';
import { DataProvenanceDrawer } from './components/layout/DataProvenanceDrawer';
import { SystemAuditDrawer } from './components/layout/SystemAuditDrawer';
import { loadSavedUniverse } from './data/userStorage';
import { getActiveCaseProfile } from './data/caseStorage';
import { CaseProfile } from './types/caseTypes';
import { SecurityRecord } from './types/quantTypes';
import {
  LayoutDashboard,
  Briefcase,
  Search,
  PieChart,
  UserCheck,
  Database,
} from 'lucide-react';

export type PrimaryTab = 'overview' | 'case-setup' | 'research' | 'portfolio' | 'decision';

export default function App() {
  const [activeTab, setActiveTab] = useState<PrimaryTab>('overview');
  const [activeCaseProfile, setActiveCaseProfile] = useState<CaseProfile>(() => getActiveCaseProfile());
  const [selectedSecuritySymbol, setSelectedSecuritySymbol] = useState<string>('AAPL');
  const [selectedProposalIdForReview, setSelectedProposalIdForReview] = useState<string>('PROP-01');

  // Drawers
  const [isSecurityProvenanceOpen, setIsSecurityProvenanceOpen] = useState(false);
  const [securityProvenanceTarget, setSecurityProvenanceTarget] = useState<SecurityRecord | null>(null);
  const [isSystemAuditOpen, setIsSystemAuditOpen] = useState(false);

  const handleSelectSecurity = (symbol: string) => {
    setSelectedSecuritySymbol(symbol);
    setActiveTab('research');
  };

  const handleOpenSecurityProvenance = (symbol: string) => {
    const universe = loadSavedUniverse();
    const sec = universe.find((s) => s.symbol === symbol) || universe[0];
    setSecurityProvenanceTarget(sec);
    setIsSecurityProvenanceOpen(true);
  };

  const handleTestPortfolioFit = (symbol: string) => {
    setSelectedSecuritySymbol(symbol);
    setActiveTab('portfolio');
  };

  const handleSelectProposalForReview = (proposalId: string) => {
    setSelectedProposalIdForReview(proposalId);
    setActiveTab('decision');
  };

  const navItems: { id: PrimaryTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'case-setup', label: 'Case Setup', icon: Briefcase },
    { id: 'research', label: 'Research', icon: Search },
    { id: 'portfolio', label: 'Portfolio Builder', icon: PieChart },
    { id: 'decision', label: 'Decision & Risk', icon: UserCheck },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-900 flex flex-col font-sans selection:bg-stone-200 selection:text-stone-900">
      {/* 1. Publication Masthead & Global Navigation */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-40 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3 sm:gap-6 min-w-0">
            {/* Brand & Mandate Identification */}
            <div className="flex items-center gap-3 min-w-0 shrink">
              <div className="w-8 h-8 shrink-0 rounded-xs bg-stone-900 text-stone-50 border border-stone-800 flex items-center justify-center font-serif text-sm font-semibold tracking-normal">
                W
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-serif font-medium text-stone-900 tracking-tight truncate">
                    Growth Sleeve Research Observatory
                  </span>
                </div>
                <div className="text-[11px] sm:text-xs text-stone-500 font-mono truncate hidden sm:flex items-center gap-1.5">
                  <span>{activeCaseProfile.policies.mandateId} · Beg-{activeCaseProfile.facts.operatingStartYear.value}</span>
                  <span className="text-stone-300">·</span>
                  <span className="px-1.5 py-0.2 bg-stone-100 text-stone-700 rounded-xs font-semibold">
                    Case: {activeCaseProfile.name} (v{activeCaseProfile.version})
                  </span>
                </div>
              </div>
            </div>

            {/* Primary Navigation — 5 Core Workspaces */}
            <nav className="hidden lg:flex items-center gap-1 shrink-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xs transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-stone-900 text-stone-50 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Audit Trigger & Utility */}
            <div className="flex items-center gap-2 sm:gap-3 text-xs shrink-0">
              <button
                onClick={() => setIsSystemAuditOpen(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 border border-stone-300 rounded-xs transition-colors font-mono text-xs whitespace-nowrap"
                title="Inspect raw request ledger and dataset manifest"
              >
                <Database className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                <span className="hidden sm:inline">Audit &amp; Ledger</span>
                <span className="sm:hidden">Audit</span>
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Sub-navigation Bar for Small Screens */}
        <div className="lg:hidden flex items-center overflow-x-auto gap-1 px-4 py-2 bg-stone-50 border-t border-stone-200 text-xs no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 bg-white border border-stone-200 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* 2. Main Workspace Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewView
            activeProfile={activeCaseProfile}
            onNavigate={(tab) => setActiveTab(tab)}
            onSelectSecurity={handleSelectSecurity}
          />
        )}

        {activeTab === 'case-setup' && (
          <CaseSetupView
            activeProfile={activeCaseProfile}
            onActiveProfileChange={(updated) => setActiveCaseProfile(updated)}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'research' && (
          <ResearchView
            activeProfile={activeCaseProfile}
            selectedSymbol={selectedSecuritySymbol}
            onSelectSecurity={handleSelectSecurity}
            onOpenProvenance={handleOpenSecurityProvenance}
            onTestPortfolioFit={handleTestPortfolioFit}
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioView
            activeProfile={activeCaseProfile}
            onSelectSecurity={handleSelectSecurity}
            onSelectProposalForReview={handleSelectProposalForReview}
          />
        )}

        {activeTab === 'decision' && (
          <DecisionView
            activeProfile={activeCaseProfile}
            initialProposalId={selectedProposalIdForReview}
          />
        )}
      </main>

      {/* 3. Global Contextual Provenance & Audit Drawers */}
      <DataProvenanceDrawer
        security={securityProvenanceTarget}
        isOpen={isSecurityProvenanceOpen}
        onClose={() => setIsSecurityProvenanceOpen(false)}
      />

      <SystemAuditDrawer
        activeProfile={activeCaseProfile}
        isOpen={isSystemAuditOpen}
        onClose={() => setIsSystemAuditOpen(false)}
      />
    </div>
  );
}
