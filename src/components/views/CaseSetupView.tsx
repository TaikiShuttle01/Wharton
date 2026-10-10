/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Wharton Global High School Investment Competition - Quantitative Growth Sleeve
 * Persistent Case Setup, Mandate Profile Manager & Policy Workspace
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  CaseProfile,
  FieldVerificationStatus,
  TimingConvention,
} from '../../types/caseTypes';
import {
  loadCaseProfiles,
  saveCaseProfile,
  getActiveCaseProfileId,
  setActiveCaseProfileId,
  createCaseProfile,
  duplicateCaseProfile,
  renameCaseProfile,
  restoreBaselineCaseProfile,
  deleteCaseProfile,
  exportProfileAsJson,
  importProfileFromJson,
  validateCaseProfile,
  OFFICIAL_BASELINE_PROFILE_ID,
} from '../../data/caseStorage';
import {
  calculateCaseDerivedOutputs,
} from '../../data/quantEngine';
import { formatCurrency, formatPercent, formatNumber } from '../../utils/formatters';
import {
  Briefcase,
  Save,
  RotateCcw,
  Plus,
  Copy,
  Edit3,
  Trash2,
  Download,
  Upload,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Landmark,
  Scale,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  Sliders,
} from 'lucide-react';

interface CaseSetupViewProps {
  activeProfile: CaseProfile;
  onActiveProfileChange: (updated: CaseProfile) => void;
  onNavigateToTab?: (tab: 'overview' | 'portfolio' | 'decision') => void;
}

export const CaseSetupView: React.FC<CaseSetupViewProps> = ({
  activeProfile,
  onActiveProfileChange,
}) => {
  // Profiles list
  const [profiles, setProfiles] = useState<CaseProfile[]>([]);

  // Working editable copy of the active profile
  const [editingProfile, setEditingProfile] = useState<CaseProfile>(activeProfile);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<'facts' | 'assumptions' | 'policies'>('facts');
  const [showAdvancedAssumptions, setShowAdvancedAssumptions] = useState<boolean>(false);

  // Modals & Notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'warn' | 'error' } | null>(null);
  const [showSwitchPrompt, setShowSwitchPrompt] = useState<{ targetProfileId: string } | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newNameInput, setNewNameInput] = useState('');
  const [newDescInput, setNewDescInput] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Delete Case Profile Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
    profileId: string;
    profileName: string;
    isDeletingActive: boolean;
    fallbackProfileId: string;
  } | null>(null);

  // Load profiles on mount
  useEffect(() => {
    const list = loadCaseProfiles();
    setProfiles(list);
  }, []);

  // Sync editing profile if activeProfile prop changes from outside and user has no unsaved edits
  useEffect(() => {
    if (!hasUnsavedChanges) {
      setEditingProfile(activeProfile);
    }
  }, [activeProfile, hasUnsavedChanges]);

  const triggerNotify = (message: string, type: 'success' | 'warn' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Derived financial outputs based on currently edited profile
  const derived = useMemo(() => {
    return calculateCaseDerivedOutputs(editingProfile);
  }, [editingProfile]);

  // Validation
  const validation = useMemo(() => {
    return validateCaseProfile(editingProfile);
  }, [editingProfile]);

  // Mark edits as dirty
  const updateEditingProfile = (updated: CaseProfile) => {
    setEditingProfile(updated);
    setHasUnsavedChanges(true);
  };

  // Save handler
  const handleSave = () => {
    const res = saveCaseProfile(editingProfile);
    if (!res.success || !res.profile) {
      triggerNotify(res.error || 'Failed to save case profile.', 'error');
      return;
    }

    setEditingProfile(res.profile);
    setHasUnsavedChanges(false);
    onActiveProfileChange(res.profile);

    // Refresh profile list
    setProfiles(loadCaseProfiles());
    triggerNotify(`Case profile "${res.profile.name}" saved successfully (v${res.profile.version}).`, 'success');
  };

  // Discard edits
  const handleDiscardEdits = () => {
    setEditingProfile(activeProfile);
    setHasUnsavedChanges(false);
    triggerNotify('Unsaved changes discarded.', 'warn');
  };

  // Profile switching with unsaved changes safeguard
  const handleSelectProfile = (targetId: string) => {
    if (targetId === editingProfile.id) return;

    if (hasUnsavedChanges) {
      setShowSwitchPrompt({ targetProfileId: targetId });
    } else {
      executeSwitchProfile(targetId);
    }
  };

  const executeSwitchProfile = (targetId: string) => {
    const target = profiles.find((p) => p.id === targetId);
    if (!target) return;

    setActiveCaseProfileId(targetId);
    setEditingProfile(target);
    setHasUnsavedChanges(false);
    onActiveProfileChange(target);
    setShowSwitchPrompt(null);
    triggerNotify(`Switched to active profile: ${target.name}.`, 'success');
  };

  // Create new profile
  const handleCreateNew = () => {
    if (!newNameInput.trim()) {
      triggerNotify('Please enter a name for the new profile.', 'warn');
      return;
    }
    const created = createCaseProfile(newNameInput, newDescInput);
    setProfiles(loadCaseProfiles());
    setShowNewModal(false);
    setNewNameInput('');
    setNewDescInput('');
    executeSwitchProfile(created.id);
  };

  // Duplicate profile
  const handleDuplicate = () => {
    const dup = duplicateCaseProfile(editingProfile.id);
    if (!dup) {
      triggerNotify('Failed to duplicate profile.', 'error');
      return;
    }
    setProfiles(loadCaseProfiles());
    executeSwitchProfile(dup.id);
    triggerNotify(`Duplicated case profile as "${dup.name}".`, 'success');
  };

  // Rename profile
  const handleRename = () => {
    if (!renameInput.trim()) return;
    const ok = renameCaseProfile(editingProfile.id, renameInput);
    if (ok) {
      const updated = { ...editingProfile, name: renameInput.trim() };
      setEditingProfile(updated);
      onActiveProfileChange(updated);
      setProfiles(loadCaseProfiles());
      setShowRenameModal(false);
      triggerNotify('Profile renamed successfully.', 'success');
    }
  };

  // Restore baseline
  const handleRestoreBaseline = () => {
    const restored = restoreBaselineCaseProfile();
    setProfiles(loadCaseProfiles());
    executeSwitchProfile(restored.id);
    triggerNotify('Official Wharton Case Baseline restored to competition ground truth.', 'success');
  };

  // Initiate Delete with confirmation modal
  const handleInitiateDelete = (profileId: string) => {
    if (profileId === OFFICIAL_BASELINE_PROFILE_ID) {
      triggerNotify('Cannot delete the official verified baseline profile. It is protected.', 'warn');
      return;
    }

    const target = profiles.find((p) => p.id === profileId);
    if (!target) return;

    // Remaining fallback profiles if target is active
    const otherProfiles = profiles.filter((p) => p.id !== profileId);
    const fallbackId =
      otherProfiles.find((p) => p.id === OFFICIAL_BASELINE_PROFILE_ID)?.id ||
      otherProfiles[0]?.id ||
      OFFICIAL_BASELINE_PROFILE_ID;

    setDeleteModalState({
      profileId,
      profileName: target.name,
      isDeletingActive: editingProfile.id === profileId,
      fallbackProfileId: fallbackId,
    });
  };

  // Execute confirmed deletion
  const handleConfirmDelete = () => {
    if (!deleteModalState) return;
    const { profileId, profileName, isDeletingActive, fallbackProfileId } = deleteModalState;

    const ok = deleteCaseProfile(profileId, fallbackProfileId);
    if (!ok) {
      triggerNotify('Failed to delete profile.', 'error');
      setDeleteModalState(null);
      return;
    }

    const updated = loadCaseProfiles();
    setProfiles(updated);

    if (isDeletingActive) {
      const fallback = updated.find((p) => p.id === fallbackProfileId) || updated[0];
      setEditingProfile(fallback);
      setHasUnsavedChanges(false);
      onActiveProfileChange(fallback);
      triggerNotify(`Case profile "${profileName}" deleted. Active profile switched to "${fallback.name}".`, 'success');
    } else {
      triggerNotify(`Case profile "${profileName}" deleted successfully.`, 'success');
    }

    setDeleteModalState(null);
  };

  // Export JSON
  const handleExportJson = () => {
    const jsonStr = exportProfileAsJson(editingProfile.id);
    if (!jsonStr) return;
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editingProfile.id}-v${editingProfile.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerNotify('Case profile exported as JSON.', 'success');
  };

  // Import JSON
  const handleImportJson = () => {
    if (!importJsonText.trim()) return;
    setImportError(null);
    const res = importProfileFromJson(importJsonText);
    if (!res.success || !res.profile) {
      setImportError(res.error || 'Failed to import JSON profile.');
      return;
    }
    setProfiles(loadCaseProfiles());
    setShowImportModal(false);
    setImportJsonText('');
    executeSwitchProfile(res.profile.id);
    triggerNotify(`Successfully imported case profile "${res.profile.name}".`, 'success');
  };

  // Field updater helpers
  const updateFactValue = (fieldKey: keyof typeof editingProfile.facts, value: any) => {
    const currentField = editingProfile.facts[fieldKey];
    updateEditingProfile({
      ...editingProfile,
      facts: {
        ...editingProfile.facts,
        [fieldKey]: {
          ...currentField,
          value,
        },
      },
    });
  };

  const updateFactStatus = (fieldKey: keyof typeof editingProfile.facts, status: FieldVerificationStatus) => {
    const currentField = editingProfile.facts[fieldKey];
    updateEditingProfile({
      ...editingProfile,
      facts: {
        ...editingProfile.facts,
        [fieldKey]: {
          ...currentField,
          status,
        },
      },
    });
  };

  const updateFactNotes = (fieldKey: keyof typeof editingProfile.facts, notes: string) => {
    const currentField = editingProfile.facts[fieldKey];
    updateEditingProfile({
      ...editingProfile,
      facts: {
        ...editingProfile.facts,
        [fieldKey]: {
          ...currentField,
          notes,
        },
      },
    });
  };

  const updateAssumption = (key: keyof typeof editingProfile.assumptions, val: any) => {
    updateEditingProfile({
      ...editingProfile,
      assumptions: {
        ...editingProfile.assumptions,
        [key]: val,
      },
    });
  };

  const updatePolicy = (key: keyof typeof editingProfile.policies, val: any) => {
    updateEditingProfile({
      ...editingProfile,
      policies: {
        ...editingProfile.policies,
        [key]: val,
      },
    });
  };

  return (
    <div className="space-y-6 max-w-7xl font-sans pb-12">
      {/* 1. Header with Concise Instructional Subtitle */}
      <div className="border-b border-stone-200 pb-5">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-stone-500 uppercase tracking-normal">
              Fiduciary Mandate Configuration
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 mt-1 font-normal tracking-tight">
              Case Setup &amp; Mandate Architecture
            </h1>
            <p className="text-sm text-stone-600 mt-1.5 max-w-3xl leading-relaxed">
              Create or select a case, verify its facts, and save the assumptions used by your analysis.
            </p>
          </div>

          {/* Quick Status Indicator */}
          <div className="flex items-center gap-2 font-mono text-xs shrink-0">
            {hasUnsavedChanges ? (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-300 rounded-xs font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Unsaved edits</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xs font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Saved &amp; Active</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Unified Case Profile Management Area */}
      <div className="bg-white border border-stone-200 rounded-xs p-5 space-y-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          {/* Profile Selector & Metadata */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-stone-800 flex items-center gap-1.5 font-sans">
              <Briefcase className="w-4 h-4 text-stone-700" />
              <span>Case Profile:</span>
            </span>

            {/* Profile Dropdown */}
            <div className="relative">
              <select
                value={editingProfile.id}
                onChange={(e) => handleSelectProfile(e.target.value)}
                className="bg-stone-50 border border-stone-300 rounded-xs px-3 py-1.5 text-xs font-mono font-medium text-stone-900 focus:outline-hidden focus:border-stone-500 min-w-[260px]"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.isBaseline ? '★ [Baseline]' : ''} (v{p.version})
                  </option>
                ))}
              </select>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              {editingProfile.isBaseline ? (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-xs font-semibold">
                  Official Baseline
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-stone-100 text-stone-700 border border-stone-200 rounded-xs">
                  Custom Profile
                </span>
              )}
              <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-xs">
                v{editingProfile.version}
              </span>
            </div>
          </div>

          {/* Profile Actions Toolbar */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {/* Primary Save Action */}
            <button
              onClick={handleSave}
              disabled={!validation.isValid}
              className={`px-3.5 py-1.5 rounded-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs ${
                hasUnsavedChanges
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white font-semibold'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Save changes to active profile"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Case</span>
            </button>

            {hasUnsavedChanges && (
              <button
                onClick={handleDiscardEdits}
                className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-xs transition-colors flex items-center gap-1"
                title="Discard uncommitted edits"
              >
                <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                <span>Discard</span>
              </button>
            )}

            <button
              onClick={() => {
                setNewNameInput('');
                setNewDescInput('');
                setShowNewModal(true);
              }}
              className="px-2.5 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xs transition-colors flex items-center gap-1"
              title="Create new profile"
            >
              <Plus className="w-3.5 h-3.5 text-stone-500" />
              <span>New</span>
            </button>

            <button
              onClick={handleDuplicate}
              className="px-2.5 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xs transition-colors flex items-center gap-1"
              title="Duplicate current profile"
            >
              <Copy className="w-3.5 h-3.5 text-stone-500" />
              <span>Duplicate</span>
            </button>

            <button
              onClick={() => {
                setRenameInput(editingProfile.name);
                setShowRenameModal(true);
              }}
              className="px-2.5 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xs transition-colors flex items-center gap-1"
              title="Rename profile"
            >
              <Edit3 className="w-3.5 h-3.5 text-stone-500" />
              <span>Rename</span>
            </button>

            {/* Accessible Delete Case Action (Protected Baseline) */}
            {editingProfile.isBaseline ? (
              <button
                disabled
                className="px-2.5 py-1.5 bg-stone-100 text-stone-400 border border-stone-200 rounded-xs cursor-not-allowed flex items-center gap-1"
                title="Official verified baseline is protected from deletion"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Baseline Protected</span>
              </button>
            ) : (
              <button
                onClick={() => handleInitiateDelete(editingProfile.id)}
                className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-900 border border-rose-300 rounded-xs transition-colors flex items-center gap-1 font-medium"
                title={`Delete case profile "${editingProfile.name}"`}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete Case</span>
              </button>
            )}

            <button
              onClick={handleExportJson}
              className="px-2 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xs transition-colors flex items-center gap-1"
              title="Export profile JSON"
            >
              <Download className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="px-2 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xs transition-colors flex items-center gap-1"
              title="Import profile JSON"
            >
              <Upload className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden sm:inline">Import</span>
            </button>
          </div>
        </div>

        {/* Profile Description & Provenance Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-600">
          <p className="font-sans leading-relaxed max-w-3xl">
            {editingProfile.description}
          </p>
          <div className="font-mono text-[11px] text-stone-500 shrink-0 flex items-center gap-3">
            <span>ID: <code className="text-stone-800">{editingProfile.id}</code></span>
            <span>·</span>
            <span>Updated: {new Date(editingProfile.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Notifications Alert Strip */}
        {notification && (
          <div
            className={`p-3 rounded-xs border text-xs flex items-center justify-between font-mono animate-in fade-in duration-150 ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : notification.type === 'warn'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-700" />}
              {notification.type === 'warn' && <AlertTriangle className="w-4 h-4 text-amber-700" />}
              {notification.type === 'error' && <X className="w-4 h-4 text-rose-700" />}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-stone-500 hover:text-stone-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Validation Errors & Warnings Strip */}
        {!validation.isValid && (
          <div className="p-3 bg-rose-50 border border-rose-300 text-rose-900 rounded-xs text-xs space-y-1 font-sans">
            <span className="font-bold flex items-center gap-1.5 font-mono">
              <AlertTriangle className="w-4 h-4 text-rose-700" />
              <span>Validation Errors (Must be resolved to save):</span>
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1 font-mono">
              {validation.issues
                .filter((i) => i.severity === 'ERROR')
                .map((i, idx) => (
                  <li key={idx}>{i.message}</li>
                ))}
            </ul>
          </div>
        )}
      </div>

      {/* 3. Clearly Separated Section Navigation Tabs */}
      <div className="border-b border-stone-200 flex gap-4 text-xs font-mono overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSection('facts')}
          className={`py-2.5 border-b-2 font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeSection === 'facts'
              ? 'border-stone-900 text-stone-900 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Landmark className="w-3.5 h-3.5" />
          <span>Official Case Facts (Wharton Brief)</span>
        </button>

        <button
          onClick={() => setActiveSection('assumptions')}
          className={`py-2.5 border-b-2 font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeSection === 'assumptions'
              ? 'border-stone-900 text-stone-900 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Investment Assumptions</span>
        </button>

        <button
          onClick={() => setActiveSection('policies')}
          className={`py-2.5 border-b-2 font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeSection === 'policies'
              ? 'border-stone-900 text-stone-900 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Team Decisions &amp; Portfolio Policies</span>
        </button>
      </div>

      {/* SECTION A: Official Case Facts */}
      {activeSection === 'facts' && (
        <div className="space-y-6">
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xs text-xs text-amber-950 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-amber-900">Wharton Ground Truth &amp; Verification Protocol:</span>
              <p className="leading-relaxed text-amber-800 text-[11px] font-sans">
                These fields map directly to verified competition case rules. Items labeled <strong className="font-mono">VERIFIED</strong> are binding case facts. Items labeled <strong className="font-mono">NEEDS_CONFIRMATION</strong> (such as contribution cash-flow timing conventions) require explicit confirmation from official case committee materials.
              </p>
            </div>
          </div>

          {/* Group 1: Capital Inflow Schedule */}
          <div className="bg-white border border-stone-200 rounded-xs p-5 space-y-4">
            <div className="border-b border-stone-100 pb-2 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-stone-900 font-sans">1. Client Capital Inflow Schedule</h3>
                <span className="text-[11px] text-stone-500 font-mono">Known cash contributions deployed into the compounding growth sleeve</span>
              </div>
              <span className="text-xs font-mono font-bold text-stone-800">
                Total Inflows: {formatCurrency(derived.totalNominalContributions, 0)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              {/* Initial Contribution */}
              <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 space-y-2">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-stone-900 font-sans">{editingProfile.facts.initialContribution.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xs font-semibold">
                    {editingProfile.facts.initialContribution.status}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-stone-400">$</span>
                  <input
                    type="number"
                    value={editingProfile.facts.initialContribution.value}
                    onChange={(e) => updateFactValue('initialContribution', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-stone-300 rounded-xs px-2 py-1 font-bold text-stone-900"
                  />
                </div>
                <div className="text-[11px] text-stone-500 font-sans">
                  Deploy Year: <strong>2027</strong> · §2.1 Client Inflows
                </div>
              </div>

              {/* Additional Contribution */}
              <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 space-y-2">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-stone-900 font-sans">{editingProfile.facts.additionalContribution.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xs font-semibold">
                    {editingProfile.facts.additionalContribution.status}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-stone-400">$</span>
                  <input
                    type="number"
                    value={editingProfile.facts.additionalContribution.value}
                    onChange={(e) => updateFactValue('additionalContribution', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-stone-300 rounded-xs px-2 py-1 font-bold text-stone-900"
                  />
                </div>
                <div className="text-[11px] text-stone-500 font-sans">
                  Deploy Year: <strong>2028</strong> · Subsequent Capital Inflow
                </div>
              </div>

              {/* Contribution Timing Convention */}
              <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 space-y-2">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-stone-900 font-sans">Cash-Flow Timing</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-amber-50 text-amber-900 border border-amber-300 rounded-xs font-semibold">
                    {editingProfile.facts.contributionTiming.status}
                  </span>
                </div>
                <select
                  value={editingProfile.facts.contributionTiming.value}
                  onChange={(e) => updateFactValue('contributionTiming', e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-xs px-2 py-1 text-xs font-mono font-medium text-stone-900"
                >
                  <option value="BEGINNING_OF_YEAR">BEGINNING_OF_YEAR (Standard)</option>
                  <option value="END_OF_YEAR">END_OF_YEAR (Conservative)</option>
                </select>
                <div className="text-[11px] text-stone-500 font-sans">
                  Assumed deployed at start of calendar year.
                </div>
              </div>
            </div>
          </div>

          {/* Group 2: Operating Commitment Schedule */}
          <div className="bg-white border border-stone-200 rounded-xs p-5 space-y-4">
            <div className="border-b border-stone-100 pb-2 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-stone-900 font-sans">2. Operating Liability Schedule</h3>
                <span className="text-[11px] text-stone-500 font-mono">Fiduciary operating obligations funded with high certainty</span>
              </div>
              <span className="text-xs font-mono font-bold text-stone-800">
                Total Liabilities: {formatCurrency(derived.totalNominalLiabilities, 0)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              {/* Annual Payment Amount */}
              <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 space-y-2">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-stone-900 font-sans">Annual Payment</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xs font-semibold">
                    VERIFIED
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-stone-400">$</span>
                  <input
                    type="number"
                    value={editingProfile.facts.annualOperatingPayment.value}
                    onChange={(e) => updateFactValue('annualOperatingPayment', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-stone-300 rounded-xs px-2 py-1 font-bold text-stone-900"
                  />
                </div>
                <div className="text-[11px] text-stone-500 font-sans">
                  Nominal obligation per year: $50,000/yr.
                </div>
              </div>

              {/* Payment Count */}
              <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 space-y-2">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-stone-900 font-sans">Payment Duration</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xs font-semibold">
                    VERIFIED
                  </span>
                </div>
                <input
                  type="number"
                  value={editingProfile.facts.operatingPaymentCount.value}
                  onChange={(e) => updateFactValue('operatingPaymentCount', parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-white border border-stone-300 rounded-xs px-2 py-1 font-bold text-stone-900"
                />
                <div className="text-[11px] text-stone-500 font-sans">
                  10 consecutive annual payments (2033–2042).
                </div>
              </div>

              {/* Lockup Horizon */}
              <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 space-y-2">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-stone-900 font-sans">Lockup Horizon</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xs font-semibold">
                    VERIFIED
                  </span>
                </div>
                <input
                  type="number"
                  value={editingProfile.facts.noWithdrawalsBeforeYear.value}
                  onChange={(e) => updateFactValue('noWithdrawalsBeforeYear', parseInt(e.target.value, 10) || 2033)}
                  className="w-full bg-white border border-stone-300 rounded-xs px-2 py-1 font-bold text-stone-900"
                />
                <div className="text-[11px] text-stone-500 font-sans">
                  Strict lockup: No withdrawals prior to 2033.
                </div>
              </div>
            </div>
          </div>

          {/* Group 3: Mission Expansion & Checkpoints */}
          <div className="bg-white border border-stone-200 rounded-xs p-5 space-y-4">
            <div className="border-b border-stone-100 pb-2">
              <h3 className="text-sm font-semibold text-stone-900 font-sans">3. Mission Expansion &amp; Milestones</h3>
              <span className="text-[11px] text-stone-500 font-mono">Taiwan creative residency residual surplus allocation</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 space-y-1.5">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-stone-900 font-sans">2031 Co-Sponsor Milestone</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xs font-semibold">
                    VERIFIED
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 font-sans leading-relaxed">
                  In 2031, communicate a credible estimated range for potential 2033 facility contribution to co-sponsors after locking the reserve.
                </p>
                <div className="text-xs text-stone-800 font-mono font-bold pt-1">
                  Checkpoint Year: {editingProfile.facts.coSponsorCommunicationYear.value}
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 space-y-1.5">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-stone-900 font-sans">Taiwan Creative Residency</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xs font-semibold">
                    VERIFIED
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 font-sans leading-relaxed">
                  Residual assets after immunizing operating liabilities may be contributed to facility mission expansion. The contribution amount is not predetermined.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION B: Investment Modeling Assumptions */}
      {activeSection === 'assumptions' && (
        <div className="space-y-6">
          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xs text-xs text-stone-700 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-stone-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-stone-900">Analyst Modeling Assumptions:</span>
              <p className="leading-relaxed text-stone-600 text-[11px] font-sans">
                These values represent analytical modeling assumptions rather than binding client facts. Adjusting them dynamically recalculates multi-year trajectory schedules and liability reserve present values.
              </p>
            </div>
          </div>

          {/* Group 1: Expected Return Scenarios */}
          <div className="bg-white border border-stone-200 rounded-xs p-5 space-y-4">
            <div className="border-b border-stone-100 pb-2">
              <h3 className="text-sm font-semibold text-stone-900 font-sans">1. Expected Annual Return Scenarios</h3>
              <span className="text-[11px] text-stone-500 font-mono">Multi-year compound annual growth rate assumptions</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 space-y-2">
                <span className="font-semibold text-stone-900 font-sans block">Baseline Expected Return</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.005"
                    value={editingProfile.assumptions.expectedAnnualReturn}
                    onChange={(e) => updateAssumption('expectedAnnualReturn', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-stone-300 rounded-xs px-2 py-1 font-bold text-emerald-800"
                  />
                  <span className="text-stone-500">({(editingProfile.assumptions.expectedAnnualReturn * 100).toFixed(1)}%)</span>
                </div>
                <span className="text-[11px] text-stone-500 font-sans block">
                  Active Growth Sleeve baseline CAGR.
                </span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 space-y-2">
                <span className="font-semibold text-stone-900 font-sans block">Conservative Return</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.005"
                    value={editingProfile.assumptions.conservativeAnnualReturn}
                    onChange={(e) => updateAssumption('conservativeAnnualReturn', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-stone-300 rounded-xs px-2 py-1 font-bold text-stone-900"
                  />
                  <span className="text-stone-500">({(editingProfile.assumptions.conservativeAnnualReturn * 100).toFixed(1)}%)</span>
                </div>
                <span className="text-[11px] text-stone-500 font-sans block">
                  Conservative stress floor for co-sponsors.
                </span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 space-y-2">
                <span className="font-semibold text-stone-900 font-sans block">Optimistic Return</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.005"
                    value={editingProfile.assumptions.optimisticAnnualReturn}
                    onChange={(e) => updateAssumption('optimisticAnnualReturn', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-stone-300 rounded-xs px-2 py-1 font-bold text-stone-900"
                  />
                  <span className="text-stone-500">({(editingProfile.assumptions.optimisticAnnualReturn * 100).toFixed(1)}%)</span>
                </div>
                <span className="text-[11px] text-stone-500 font-sans block">
                  High compounding growth envelope.
                </span>
              </div>
            </div>
          </div>

          {/* Group 2: Fiduciary Discount & Hurdle Rates */}
          <div className="bg-white border border-stone-200 rounded-xs p-5 space-y-4">
            <div className="border-b border-stone-100 pb-2">
              <h3 className="text-sm font-semibold text-stone-900 font-sans">2. Fiduciary Discount &amp; Hurdle Rates</h3>
              <span className="text-[11px] text-stone-500 font-mono">Present value discounting and risk-adjusted hurdles</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 space-y-2">
                <span className="font-semibold text-stone-900 font-sans block">Reserve Discount Rate</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.0025"
                    value={editingProfile.assumptions.reserveDiscountRate}
                    onChange={(e) => updateAssumption('reserveDiscountRate', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-stone-300 rounded-xs px-2 py-1 font-bold text-teal-900"
                  />
                  <span className="text-stone-500">({(editingProfile.assumptions.reserveDiscountRate * 100).toFixed(2)}%)</span>
                </div>
                <span className="text-[11px] text-stone-500 font-sans block">
                  Discount rate for 10-year annuity PV.
                </span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 space-y-2">
                <span className="font-semibold text-stone-900 font-sans block">Risk-Free Rate (Rf)</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.0025"
                    value={editingProfile.assumptions.riskFreeRate}
                    onChange={(e) => updateAssumption('riskFreeRate', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-stone-300 rounded-xs px-2 py-1 font-bold text-stone-900"
                  />
                  <span className="text-stone-500">({(editingProfile.assumptions.riskFreeRate * 100).toFixed(2)}%)</span>
                </div>
                <span className="text-[11px] text-stone-500 font-sans block">
                  Used for Sharpe &amp; Sortino calculations.
                </span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 space-y-2">
                <span className="font-semibold text-stone-900 font-sans block">Severe Stress Haircut</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.05"
                    value={editingProfile.assumptions.stressScenarioHaircut}
                    onChange={(e) => updateAssumption('stressScenarioHaircut', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-stone-300 rounded-xs px-2 py-1 font-bold text-rose-900"
                  />
                  <span className="text-stone-500">({(editingProfile.assumptions.stressScenarioHaircut * 100).toFixed(0)}%)</span>
                </div>
                <span className="text-[11px] text-stone-500 font-sans block">
                  Drawdown buffer for stressed reserve coverage.
                </span>
              </div>
            </div>
          </div>

          {/* Group 3: Collapsible Advanced Parameters */}
          <div className="bg-white border border-stone-200 rounded-xs p-4 space-y-3">
            <button
              onClick={() => setShowAdvancedAssumptions(!showAdvancedAssumptions)}
              className="w-full flex justify-between items-center text-xs font-semibold text-stone-800 font-sans"
            >
              <span>Advanced Parameters (Inflation, Taxes, Transaction Costs)</span>
              {showAdvancedAssumptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvancedAssumptions && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-stone-100 font-mono text-xs">
                <div>
                  <label className="text-[11px] text-stone-600 block mb-1 font-sans">Inflation Assumption:</label>
                  <input
                    type="number"
                    step="0.005"
                    value={editingProfile.assumptions.inflationAssumption}
                    onChange={(e) => updateAssumption('inflationAssumption', parseFloat(e.target.value) || 0)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xs px-2 py-1"
                  />
                  <span className="text-[10px] text-stone-500 font-sans mt-0.5 block">0% nominal per case brief.</span>
                </div>

                <div>
                  <label className="text-[11px] text-stone-600 block mb-1 font-sans">Transaction Costs (bps):</label>
                  <input
                    type="number"
                    value={editingProfile.assumptions.transactionCostBps}
                    onChange={(e) => updateAssumption('transactionCostBps', parseFloat(e.target.value) || 0)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xs px-2 py-1"
                  />
                  <span className="text-[10px] text-stone-500 font-sans mt-0.5 block">Liquid high-cap instruments.</span>
                </div>

                <div>
                  <label className="text-[11px] text-stone-600 block mb-1 font-sans">Tax Rate (%):</label>
                  <input
                    type="number"
                    value={editingProfile.assumptions.taxRate}
                    onChange={(e) => updateAssumption('taxRate', parseFloat(e.target.value) || 0)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xs px-2 py-1"
                  />
                  <span className="text-[10px] text-stone-500 font-sans mt-0.5 block">Tax-exempt institutional client.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION C: Team Decisions & Portfolio Policies */}
      {activeSection === 'policies' && (
        <div className="space-y-6">
          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xs text-xs text-stone-700 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-stone-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-stone-900">Investment Committee Policy Bounds:</span>
              <p className="leading-relaxed text-stone-600 text-[11px] font-sans">
                These constraints govern candidate portfolio construction and trigger warnings in the Portfolio Builder and Research workspaces when violated.
              </p>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-xs p-5 space-y-4">
            <div className="border-b border-stone-100 pb-2">
              <h3 className="text-sm font-semibold text-stone-900 font-sans">Portfolio Allocation Boundaries</h3>
              <span className="text-[11px] text-stone-500 font-mono">Weight limits enforced across proposal construction</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 space-y-2">
                <span className="font-semibold text-stone-900 font-sans block">Max Single Position Weight</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.05"
                    value={editingProfile.policies.maxSinglePositionWeight}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      updatePolicy('maxSinglePositionWeight', v);
                      updatePolicy('maxSinglePositionLimit', v);
                    }}
                    className="w-full bg-white border border-stone-300 rounded-xs px-2 py-1 font-bold text-stone-900"
                  />
                  <span className="text-stone-500">({(editingProfile.policies.maxSinglePositionWeight * 100).toFixed(0)}%)</span>
                </div>
                <span className="text-[11px] text-stone-500 font-sans block">
                  Prevents single-asset overconcentration.
                </span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 space-y-2">
                <span className="font-semibold text-stone-900 font-sans block">Min &amp; Max Cash Allocation</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={editingProfile.policies.minCashAllocation}
                    onChange={(e) => updatePolicy('minCashAllocation', parseFloat(e.target.value) || 0)}
                    className="w-16 bg-white border border-stone-300 rounded-xs px-1.5 py-1 text-center font-bold"
                  />
                  <span className="text-stone-400">to</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProfile.policies.maxCashAllocation}
                    onChange={(e) => updatePolicy('maxCashAllocation', parseFloat(e.target.value) || 0)}
                    className="w-16 bg-white border border-stone-300 rounded-xs px-1.5 py-1 text-center font-bold"
                  />
                </div>
                <span className="text-[11px] text-stone-500 font-sans block">
                  Mandate cash buffer boundaries.
                </span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 space-y-2">
                <span className="font-semibold text-stone-900 font-sans block">Target Growth Allocation</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.05"
                    value={editingProfile.policies.targetGrowthAllocation}
                    onChange={(e) => updatePolicy('targetGrowthAllocation', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-stone-300 rounded-xs px-2 py-1 font-bold text-stone-900"
                  />
                  <span className="text-stone-500">({(editingProfile.policies.targetGrowthAllocation * 100).toFixed(0)}%)</span>
                </div>
                <span className="text-[11px] text-stone-500 font-sans block">
                  Growth equity target split.
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-xs p-5 space-y-4">
            <div className="border-b border-stone-100 pb-2">
              <h3 className="text-sm font-semibold text-stone-900 font-sans">Quality &amp; Screening Policies</h3>
              <span className="text-[11px] text-stone-500 font-mono">Fiduciary data and ethical screening standards</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 space-y-2">
                <span className="font-semibold text-stone-900 font-sans block">Min WInS Verified Data</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.05"
                    value={editingProfile.policies.minWinsVerificationThreshold}
                    onChange={(e) => updatePolicy('minWinsVerificationThreshold', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-stone-300 rounded-xs px-2 py-1 font-bold text-stone-900"
                  />
                  <span className="text-stone-500">({(editingProfile.policies.minWinsVerificationThreshold * 100).toFixed(0)}%)</span>
                </div>
                <span className="text-[11px] text-stone-500 font-sans block">
                  Required data verification threshold.
                </span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 space-y-2">
                <span className="font-semibold text-stone-900 font-sans block">Rebalancing Frequency</span>
                <select
                  value={editingProfile.policies.rebalancingFrequency}
                  onChange={(e) => updatePolicy('rebalancingFrequency', e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-xs px-2 py-1 text-xs font-mono font-medium text-stone-900"
                >
                  <option value="ANNUAL">ANNUAL</option>
                  <option value="SEMI_ANNUAL">SEMI_ANNUAL</option>
                  <option value="QUARTERLY">QUARTERLY</option>
                  <option value="OPPORTUNISTIC">OPPORTUNISTIC</option>
                </select>
                <span className="text-[11px] text-stone-500 font-sans block">
                  Portfolio monitoring schedule.
                </span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 space-y-2">
                <span className="font-semibold text-stone-900 font-sans block">ESG / Negative Screening</span>
                <input
                  type="text"
                  value={editingProfile.policies.esgNegativeScreening}
                  onChange={(e) => updatePolicy('esgNegativeScreening', e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-xs px-2 py-1 text-xs font-sans text-stone-900"
                />
                <span className="text-[11px] text-stone-500 font-sans block">
                  Mandate exclusions criteria.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Real-Time Case-Derived Outputs & Co-Sponsor Milestone */}
      <div className="bg-white border border-stone-200 rounded-xs p-5 space-y-4 font-mono text-xs shadow-2xs">
        <div className="border-b border-stone-100 pb-2 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-stone-900 font-sans">Dynamic Case-Derived Outputs</h3>
            <span className="text-[11px] text-stone-500 font-mono">
              Recalculated automatically for "{editingProfile.name}"
            </span>
          </div>
          <span className="text-xs font-bold text-teal-800">
            Target Beg-{editingProfile.facts.operatingStartYear.value}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border-l-2 border-stone-300 pl-3">
            <span className="text-stone-500 block text-[11px] font-sans">Net Nominal Cash Flow</span>
            <span className={`text-base font-bold block mt-0.5 ${derived.netNominalCashFlow >= 0 ? 'text-stone-900' : 'text-stone-700'}`}>
              {formatCurrency(derived.netNominalCashFlow, 0)}
            </span>
            <span className="text-[10px] text-stone-500 font-sans">
              ${derived.totalNominalContributions / 1000}k in vs ${derived.totalNominalLiabilities / 1000}k out
            </span>
          </div>

          <div className="border-l-2 border-stone-300 pl-3">
            <span className="text-stone-500 block text-[11px] font-sans">Reserve PV (Beg-2033)</span>
            <span className="text-base font-bold text-teal-800 block mt-0.5">
              {formatCurrency(derived.reserveSpec.reservePVBeginning2033, 0)}
            </span>
            <span className="text-[10px] text-stone-500 font-sans">
              @ {(editingProfile.assumptions.reserveDiscountRate * 100).toFixed(1)}% discount rate
            </span>
          </div>

          <div className="border-l-2 border-stone-300 pl-3">
            <span className="text-stone-500 block text-[11px] font-sans">Reserve Coverage Ratio</span>
            <span className="text-base font-bold text-emerald-800 block mt-0.5">
              {(derived.reserveCoverageRatioBaseline * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] text-stone-500 font-sans">
              Stressed: {(derived.reserveCoverageRatioStressed * 100).toFixed(1)}%
            </span>
          </div>

          <div className="border-l-2 border-stone-300 pl-3">
            <span className="text-stone-500 block text-[11px] font-sans">Taiwan Residency Surplus</span>
            <span className="text-base font-bold text-emerald-800 block mt-0.5">
              {formatCurrency(derived.reserveSpec.residualCapitalBaseline, 0)}
            </span>
            <span className="text-[10px] text-stone-500 font-sans">
              Stressed: {formatCurrency(derived.reserveSpec.residualCapitalStressed, 0)}
            </span>
          </div>
        </div>

        {/* 2031 Co-Sponsor Guidance Checkpoint */}
        <div className="p-3 bg-stone-50 rounded-xs border border-stone-200 space-y-1 font-sans text-xs">
          <span className="font-bold font-mono text-stone-900 block text-[11px]">
            2031 Co-Sponsor Communication Checkpoint:
          </span>
          <p className="text-stone-700 leading-relaxed text-[11px]">
            {derived.coSponsorMilestone.guidanceText}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: DELETE CASE PROFILE CONFIRMATION                                   */}
      {/* ========================================================================= */}
      {deleteModalState && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-xs p-6 max-w-md w-full shadow-2xl space-y-4 font-sans text-xs">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <Trash2 className="w-5 h-5 text-rose-700 shrink-0" />
              <span>Confirm Case Profile Deletion</span>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xs text-rose-900 space-y-1">
              <span className="font-bold font-mono text-xs block">
                Target Profile: {deleteModalState.profileName}
              </span>
              <span className="text-[11px] font-mono block text-rose-800">
                Profile ID: {deleteModalState.profileId}
              </span>
            </div>

            {deleteModalState.isDeletingActive && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xs text-amber-950 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Deleting Active Profile</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  This profile is currently active. Please select which valid case profile to switch to upon deletion:
                </p>
                <div>
                  <label className="text-[10px] font-mono text-stone-600 block mb-1">Fallback Profile:</label>
                  <select
                    value={deleteModalState.fallbackProfileId}
                    onChange={(e) =>
                      setDeleteModalState({
                        ...deleteModalState,
                        fallbackProfileId: e.target.value,
                      })
                    }
                    className="w-full bg-white border border-stone-300 rounded-xs px-2.5 py-1 text-xs font-mono"
                  >
                    {profiles
                      .filter((p) => p.id !== deleteModalState.profileId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.isBaseline ? '★ [Baseline]' : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {hasUnsavedChanges && editingProfile.id === deleteModalState.profileId && (
              <div className="p-2.5 bg-stone-100 rounded-xs text-[11px] text-stone-700">
                Notice: Unsaved edits on this profile will be permanently discarded.
              </div>
            )}

            <p className="text-stone-600 text-[11px] leading-relaxed">
              Deleting this case profile will <strong>not</strong> delete your saved research universe, historical market data, or portfolio proposals.
            </p>

            <div className="flex justify-end gap-2 pt-2 font-mono">
              <button
                onClick={() => setDeleteModalState(null)}
                className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Switch Profile Safeguard */}
      {showSwitchPrompt && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-xs p-6 max-w-md w-full shadow-2xl space-y-4 font-sans text-xs">
            <h3 className="text-sm font-bold text-stone-900 font-serif">Unsaved Changes Detected</h3>
            <p className="text-stone-600 text-xs leading-relaxed">
              You have uncommitted modifications to profile <strong>"{editingProfile.name}"</strong>. Switching profiles will discard these changes unless you save them.
            </p>
            <div className="flex justify-end gap-2 pt-2 font-mono">
              <button
                onClick={() => setShowSwitchPrompt(null)}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  executeSwitchProfile(showSwitchPrompt.targetProfileId);
                }}
                className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xs font-medium"
              >
                Discard &amp; Switch
              </button>
              <button
                onClick={() => {
                  handleSave();
                  executeSwitchProfile(showSwitchPrompt.targetProfileId);
                }}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xs font-semibold"
              >
                Save &amp; Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Rename Profile */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-xs p-6 max-w-sm w-full shadow-2xl space-y-4 font-sans text-xs">
            <h3 className="text-sm font-bold text-stone-900 font-serif">Rename Case Profile</h3>
            <div>
              <label className="block text-[11px] text-stone-600 font-sans mb-1">New Profile Name:</label>
              <input
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xs px-2.5 py-1.5 text-xs font-mono font-medium"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 font-mono">
              <button
                onClick={() => setShowRenameModal(false)}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xs font-semibold"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: New Profile */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-xs p-6 max-w-md w-full shadow-2xl space-y-4 font-sans text-xs">
            <h3 className="text-sm font-bold text-stone-900 font-serif">Create New Case Profile</h3>
            <div className="space-y-3 font-mono">
              <div>
                <label className="block text-[11px] text-stone-600 font-sans mb-1">Profile Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Wharton 2026-27 High Growth Scenario"
                  value={newNameInput}
                  onChange={(e) => setNewNameInput(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xs px-2.5 py-1.5 text-xs"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-600 font-sans mb-1">Description:</label>
                <textarea
                  rows={3}
                  placeholder="Brief analytical thesis or mandate rationale..."
                  value={newDescInput}
                  onChange={(e) => setNewDescInput(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xs px-2.5 py-1.5 text-xs font-sans"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 font-mono">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNew}
                className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xs font-semibold"
              >
                Create Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Import JSON */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-xs p-6 max-w-lg w-full shadow-2xl space-y-4 font-sans text-xs">
            <h3 className="text-sm font-bold text-stone-900 font-serif">Import Case Profile JSON</h3>
            <p className="text-stone-600 text-[11px]">
              Paste exported case profile JSON. Schema validation will verify the inputs before importing.
            </p>
            <div>
              <textarea
                rows={8}
                placeholder="Paste profile JSON payload here..."
                value={importJsonText}
                onChange={(e) => {
                  setImportJsonText(e.target.value);
                  setImportError(null);
                }}
                className="w-full bg-stone-50 border border-stone-300 rounded-xs p-2.5 text-xs font-mono"
              />
            </div>
            {importError && (
              <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-xs text-[11px] font-mono">
                {importError}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1 font-mono">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportError(null);
                }}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleImportJson}
                className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xs font-semibold"
              >
                Import &amp; Validate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
