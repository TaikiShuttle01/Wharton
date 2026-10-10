/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Persistent Storage Layer for Investment Committee Decision Records
 *
 * Implements persistent, version-aware decision tracking linked to:
 * - Active Case Profile (ID and version)
 * - Selected Portfolio Proposal (ID and version)
 * - Assumption version
 * - Analysis generation timestamp
 *
 * Distinguishes:
 * 1. Team Recommendation (Analyst proposal, recommendation stance, risk narrative)
 * 2. Official CIO Decision (Recorded committee status: DRAFT, PROPOSED, ACCEPTED, REJECTED, NEEDS_REVISION)
 */

export type DecisionStatus = 'DRAFT' | 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'NEEDS_REVISION';
export type TeamRecommendationStance = 'RECOMMEND' | 'NEUTRAL' | 'DO_NOT_RECOMMEND';

export interface PersistentDecisionRecord {
  id: string; // "DECISION_{caseProfileId}_{proposalId}"
  caseProfileId: string;
  caseProfileVersion: number;
  caseProfileName: string;
  proposalId: string;
  proposalVersion: number;
  proposalName: string;
  assumptionVersion: number;
  analysisTimestamp: string;

  // Decision Status: DRAFT, PROPOSED, ACCEPTED, REJECTED, or NEEDS_REVISION
  status: DecisionStatus;

  // Team recommendation (distinct from recorded CIO decision)
  teamRecommendation: {
    stance: TeamRecommendationStance;
    writtenRationale: string;
    keyRisks: string;
    unresolvedQuestions: string;
    analystName: string;
    date: string;
  };

  // Official CIO Committee Decision
  cioDecision: {
    decisionMaker: string;
    date: string;
    writtenRationale: string;
    conditionsOrRevisions: string;
  };

  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY_DECISION_RECORDS = 'growth_sleeve_decision_records_v1';

/**
 * Creates a clean initial decision record for a case and proposal pair.
 */
export function createDefaultDecisionRecord(
  caseProfileId: string,
  caseProfileVersion: number,
  caseProfileName: string,
  proposalId: string,
  proposalVersion: number,
  proposalName: string,
  assumptionVersion: number = 1
): PersistentDecisionRecord {
  const now = new Date().toISOString();
  const dateStr = now.split('T')[0];

  return {
    id: `DECISION_${caseProfileId}_${proposalId}`,
    caseProfileId,
    caseProfileVersion,
    caseProfileName,
    proposalId,
    proposalVersion,
    proposalName,
    assumptionVersion,
    analysisTimestamp: now,
    status: 'DRAFT',
    teamRecommendation: {
      stance: 'RECOMMEND',
      writtenRationale: '',
      keyRisks: '',
      unresolvedQuestions: '',
      analystName: 'Lead Quantitative Analyst',
      date: dateStr,
    },
    cioDecision: {
      decisionMaker: 'Investment Committee CIO',
      date: dateStr,
      writtenRationale: '',
      conditionsOrRevisions: '',
    },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Loads all saved decision records from localStorage.
 */
export function loadAllDecisionRecords(): Record<string, PersistentDecisionRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DECISION_RECORDS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
    return {};
  } catch (err) {
    console.warn('Failed to parse decision records from storage; returning empty map', err);
    return {};
  }
}

/**
 * Loads a decision record for a specific case profile and proposal.
 * If none exists, creates and returns a clean default (without auto-approving).
 */
export function loadDecisionRecord(
  caseProfileId: string,
  caseProfileVersion: number,
  caseProfileName: string,
  proposalId: string,
  proposalVersion: number,
  proposalName: string,
  assumptionVersion: number = 1
): PersistentDecisionRecord {
  const records = loadAllDecisionRecords();
  const key = `DECISION_${caseProfileId}_${proposalId}`;
  const existing = records[key];

  if (existing) {
    // Return existing record, updating metadata if proposal or case version advanced
    return {
      ...existing,
      caseProfileVersion,
      caseProfileName,
      proposalVersion,
      proposalName,
      assumptionVersion,
    };
  }

  return createDefaultDecisionRecord(
    caseProfileId,
    caseProfileVersion,
    caseProfileName,
    proposalId,
    proposalVersion,
    proposalName,
    assumptionVersion
  );
}

/**
 * Saves a decision record to localStorage.
 */
export function saveDecisionRecord(record: PersistentDecisionRecord): boolean {
  try {
    const records = loadAllDecisionRecords();
    const key = `DECISION_${record.caseProfileId}_${record.proposalId}`;
    const now = new Date().toISOString();

    records[key] = {
      ...record,
      updatedAt: now,
    };

    localStorage.setItem(STORAGE_KEY_DECISION_RECORDS, JSON.stringify(records));
    return true;
  } catch (err) {
    console.error('Failed to save decision record to localStorage', err);
    return false;
  }
}

/**
 * Deletes a decision record if the referenced proposal or case profile is deleted.
 */
export function deleteDecisionRecord(caseProfileId: string, proposalId: string): boolean {
  try {
    const records = loadAllDecisionRecords();
    const key = `DECISION_${caseProfileId}_${proposalId}`;
    if (records[key]) {
      delete records[key];
      localStorage.setItem(STORAGE_KEY_DECISION_RECORDS, JSON.stringify(records));
    }
    return true;
  } catch (err) {
    console.error('Failed to delete decision record', err);
    return false;
  }
}
