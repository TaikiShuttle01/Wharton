/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Browser Persistence Layer for User Universe and User Proposals
 *
 * Implements a clean, decoupled localStorage persistence layer:
 * - Saved Research Universe (Securities)
 * - User-Defined Construction Proposals (with immutable IDs, versions, and validation state)
 * - Safe error handling, schema validation, and fallback to defaults
 */

import { SecurityRecord } from '../types/quantTypes';
import { UNIVERSE_SECURITIES } from './quantModelData';
import { EngineEvaluationResult, evaluatePortfolioWeights } from './quantEngine';

export interface UserProposalHolding {
  symbol: string;
  weight: number; // 0.0 to 1.0 (e.g. 0.25 = 25%)
}

export interface UserProposal {
  id: string; // e.g. "USER-PROP-1696..."
  name: string;
  description?: string;
  holdings: UserProposalHolding[];
  createdAt: string;
  updatedAt: string;
  version: number;
  isDraft: boolean;
  evaluation?: EngineEvaluationResult;
}

const STORAGE_KEY_UNIVERSE = 'growth_sleeve_saved_universe_v1';
const STORAGE_KEY_PROPOSALS = 'growth_sleeve_user_proposals_v1';

/**
 * Loads the user's saved research universe.
 * If none saved, returns the default UNIVERSE_SECURITIES.
 */
export function loadSavedUniverse(): SecurityRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UNIVERSE);
    if (!raw) {
      // Seed with default initial universe
      saveUniverse(UNIVERSE_SECURITIES);
      return UNIVERSE_SECURITIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return UNIVERSE_SECURITIES;
  } catch (err) {
    console.warn('Failed to read saved universe from storage; using defaults', err);
    return UNIVERSE_SECURITIES;
  }
}

/**
 * Saves the user research universe to storage.
 */
export function saveUniverse(securities: SecurityRecord[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY_UNIVERSE, JSON.stringify(securities));
    return true;
  } catch (err) {
    console.error('Failed to save universe to localStorage', err);
    return false;
  }
}

/**
 * Adds a security to the saved universe if not already present.
 */
export function addSecurityToUniverse(security: SecurityRecord): { success: boolean; error?: string } {
  const current = loadSavedUniverse();
  const exists = current.some((s) => s.symbol.toUpperCase() === security.symbol.toUpperCase());
  if (exists) {
    return { success: false, error: `${security.symbol} is already in your research universe.` };
  }
  const updated = [...current, security];
  const ok = saveUniverse(updated);
  return { success: ok, error: ok ? undefined : 'Storage limit or write error occurred.' };
}

/**
 * Removes a security from the saved universe.
 */
export function removeSecurityFromUniverse(symbol: string): { success: boolean; proposalsAffected: string[] } {
  const current = loadSavedUniverse();
  const updated = current.filter((s) => s.symbol.toUpperCase() !== symbol.toUpperCase());
  saveUniverse(updated);

  // Check if any proposals use this symbol
  const proposals = loadUserProposals();
  const affected = proposals
    .filter((p) => p.holdings.some((h) => h.symbol.toUpperCase() === symbol.toUpperCase()))
    .map((p) => p.name);

  return { success: true, proposalsAffected: affected };
}

/**
 * Updates or refreshes a security record in the universe.
 */
export function updateSecurityInUniverse(security: SecurityRecord): boolean {
  const current = loadSavedUniverse();
  const idx = current.findIndex((s) => s.symbol.toUpperCase() === security.symbol.toUpperCase());
  if (idx >= 0) {
    current[idx] = security;
  } else {
    current.push(security);
  }
  return saveUniverse(current);
}

/**
 * Initial default proposals if the user has not created any.
 */
export function getDefaultProposals(): UserProposal[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'PROP-01',
      name: 'Proposal 1: Core Quality Sleeve',
      description: 'Restricted to top mega-cap equities with cash buffer: AAPL (45%), MSFT (45%), CASH (10%).',
      holdings: [
        { symbol: 'AAPL', weight: 0.45 },
        { symbol: 'MSFT', weight: 0.45 },
        { symbol: 'CASH', weight: 0.10 },
      ],
      createdAt: now,
      updatedAt: now,
      version: 1,
      isDraft: false,
    },
    {
      id: 'PROP-02',
      name: 'Proposal 2: Unconstrained Growth Sleeve',
      description: 'Includes semiconductor and cloud leaders: AAPL (30%), MSFT (30%), NVDA (25%), AMZN (15%).',
      holdings: [
        { symbol: 'AAPL', weight: 0.30 },
        { symbol: 'MSFT', weight: 0.30 },
        { symbol: 'NVDA', weight: 0.25 },
        { symbol: 'AMZN', weight: 0.15 },
      ],
      createdAt: now,
      updatedAt: now,
      version: 1,
      isDraft: false,
    },
    {
      id: 'PROP-03',
      name: 'Proposal 3: Capital Preservation Sleeve',
      description: 'Conservative 20% cash allocation with core tech: AAPL (40%), MSFT (40%), CASH (20%).',
      holdings: [
        { symbol: 'AAPL', weight: 0.40 },
        { symbol: 'MSFT', weight: 0.40 },
        { symbol: 'CASH', weight: 0.20 },
      ],
      createdAt: now,
      updatedAt: now,
      version: 1,
      isDraft: false,
    },
    {
      id: 'PROP-04',
      name: 'Proposal 4: Equal-Weight Candidate Sleeve',
      description: 'Balanced 25% distribution across all four researched candidates: AAPL, MSFT, NVDA, AMZN.',
      holdings: [
        { symbol: 'AAPL', weight: 0.25 },
        { symbol: 'MSFT', weight: 0.25 },
        { symbol: 'NVDA', weight: 0.25 },
        { symbol: 'AMZN', weight: 0.25 },
      ],
      createdAt: now,
      updatedAt: now,
      version: 1,
      isDraft: false,
    },
  ];
}

/**
 * Loads user proposals from storage, evaluated with the engine.
 */
export function loadUserProposals(): UserProposal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROPOSALS);
    let proposals: UserProposal[];
    if (raw === null) {
      proposals = getDefaultProposals();
      saveUserProposals(proposals);
    } else {
      proposals = JSON.parse(raw);
      if (!Array.isArray(proposals)) {
        proposals = getDefaultProposals();
        saveUserProposals(proposals);
      } else if (proposals.length === 0) {
        const now = new Date().toISOString();
        proposals = [
          {
            id: `PROP-${Date.now().toString(36).toUpperCase()}`,
            name: 'Draft Proposal 1',
            description: 'New unallocated proposal draft.',
            holdings: [{ symbol: 'CASH', weight: 1.0 }],
            createdAt: now,
            updatedAt: now,
            version: 1,
            isDraft: true,
          },
        ];
        saveUserProposals(proposals);
      }
    }

    // Evaluate valid proposals with quantitative engine
    const universe = loadSavedUniverse();
    return proposals.map((p) => {
      const evalResult = evaluatePortfolioWeights(p.holdings, undefined, undefined, universe);
      return {
        ...p,
        evaluation: evalResult,
      };
    });
  } catch (err) {
    console.warn('Failed to parse proposals from storage; using defaults', err);
    return getDefaultProposals();
  }
}

/**
 * Saves user proposals to storage.
 */
export function saveUserProposals(proposals: UserProposal[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY_PROPOSALS, JSON.stringify(proposals));
    return true;
  } catch (err) {
    console.error('Failed to save proposals to localStorage', err);
    return false;
  }
}

/**
 * Creates and persists a new proposal.
 */
export function createUserProposal(
  name: string,
  holdings: UserProposalHolding[],
  description?: string,
  isDraft: boolean = false
): UserProposal {
  const proposals = loadUserProposals();
  const now = new Date().toISOString();
  const id = `PROP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const newProp: UserProposal = {
    id,
    name: name.trim() || `Custom Proposal ${proposals.length + 1}`,
    description: description?.trim(),
    holdings,
    createdAt: now,
    updatedAt: now,
    version: 1,
    isDraft,
  };

  const updated = [newProp, ...proposals];
  saveUserProposals(updated);
  return newProp;
}

/**
 * Updates an existing proposal.
 */
export function updateUserProposal(proposal: UserProposal): boolean {
  const proposals = loadUserProposals();
  const idx = proposals.findIndex((p) => p.id === proposal.id);
  if (idx < 0) return false;

  const now = new Date().toISOString();
  proposals[idx] = {
    ...proposal,
    updatedAt: now,
    version: (proposals[idx].version || 1) + 1,
  };

  return saveUserProposals(proposals);
}

/**
 * Duplicates a proposal with a new unique ID.
 */
export function duplicateUserProposal(sourceId: string): UserProposal | null {
  const proposals = loadUserProposals();
  const source = proposals.find((p) => p.id === sourceId);
  if (!source) return null;

  const now = new Date().toISOString();
  const newProp: UserProposal = {
    ...source,
    id: `PROP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    name: `${source.name} (Copy)`,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  const updated = [newProp, ...proposals];
  saveUserProposals(updated);
  return newProp;
}

/**
 * Deletes a proposal by ID.
 * If all proposals are deleted, automatically initializes a clean draft proposal.
 */
export function deleteUserProposal(id: string): boolean {
  const proposals = loadUserProposals();
  let updated = proposals.filter((p) => p.id !== id);
  if (updated.length === 0) {
    const now = new Date().toISOString();
    const blankDraft: UserProposal = {
      id: `PROP-${Date.now().toString(36).toUpperCase()}`,
      name: 'Draft Proposal 1',
      description: 'New unallocated proposal draft.',
      holdings: [{ symbol: 'CASH', weight: 1.0 }],
      createdAt: now,
      updatedAt: now,
      version: 1,
      isDraft: true,
    };
    updated = [blankDraft];
  }
  return saveUserProposals(updated);
}
