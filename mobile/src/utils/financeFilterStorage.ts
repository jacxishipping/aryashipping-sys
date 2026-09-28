import { BankImportPreview, DueAgingBucketKey, FinancialReportType } from '../types/admin';
import * as secureStorage from './secureStorage';

const FINANCE_REPORT_FILTERS_KEY = 'finance_report_filters';
const AGING_REPORT_FILTERS_KEY = 'aging_report_filters';
const BANKING_REVIEW_STATE_KEY = 'banking_review_state';
const BANKING_IMPORT_DRAFT_KEY = 'banking_import_draft';

export type FinanceDatePreset = 'this-month' | 'last-30-days' | 'quarter-to-date' | 'custom' | null;
export type BankingEntryFilterValue = 'all' | 'pending' | 'reviewed' | 'follow-up' | 'DEBIT' | 'CREDIT';

export interface PersistedFinanceReportFilters {
  reportType: FinancialReportType;
  startDate: string;
  endDate: string;
  filterUserId: string | null;
  datePreset: FinanceDatePreset;
}

export interface PersistedAgingReportFilters {
  selectedBucket: DueAgingBucketKey;
  userSearch: string;
  filterUserId: string | null;
}

export interface PersistedBankingReviewState {
  entryFilter: BankingEntryFilterValue;
  selectedEntryId: string | null;
  reviewNoteDrafts: Record<string, string>;
  selectedBankItemId: string | null;
  selectedBankAccountId: string | null;
}

export interface PersistedBankingImportFile {
  uri: string;
  name?: string;
  mimeType?: string | null;
}

export interface PersistedBankingImportDraft {
  selectedFile: PersistedBankingImportFile | null;
  preview: BankImportPreview | null;
  statementEndingBalance: string;
}

const defaultFinanceReportFilters: PersistedFinanceReportFilters = {
  reportType: 'summary',
  startDate: '',
  endDate: '',
  filterUserId: null,
  datePreset: null,
};

const defaultAgingReportFilters: PersistedAgingReportFilters = {
  selectedBucket: 'current',
  userSearch: '',
  filterUserId: null,
};

const defaultBankingReviewState: PersistedBankingReviewState = {
  entryFilter: 'all',
  selectedEntryId: null,
  reviewNoteDrafts: {},
  selectedBankItemId: null,
  selectedBankAccountId: null,
};

const defaultBankingImportDraft: PersistedBankingImportDraft = {
  selectedFile: null,
  preview: null,
  statementEndingBalance: '',
};

async function loadJsonState<T>(key: string, fallback: T): Promise<T> {
  try {
    const storedValue = await secureStorage.getItem(key);
    if (!storedValue) {
      return fallback;
    }

    return {
      ...fallback,
      ...JSON.parse(storedValue),
    } as T;
  } catch (error) {
    await secureStorage.deleteItem(key);
    return fallback;
  }
}

async function saveJsonState(key: string, value: unknown): Promise<void> {
  await secureStorage.setItem(key, JSON.stringify(value));
}

export function loadFinanceReportFilters() {
  return loadJsonState(FINANCE_REPORT_FILTERS_KEY, defaultFinanceReportFilters);
}

export function saveFinanceReportFilters(value: PersistedFinanceReportFilters) {
  return saveJsonState(FINANCE_REPORT_FILTERS_KEY, value);
}

export function loadAgingReportFilters() {
  return loadJsonState(AGING_REPORT_FILTERS_KEY, defaultAgingReportFilters);
}

export function saveAgingReportFilters(value: PersistedAgingReportFilters) {
  return saveJsonState(AGING_REPORT_FILTERS_KEY, value);
}

export function loadBankingReviewState() {
  return loadJsonState(BANKING_REVIEW_STATE_KEY, defaultBankingReviewState);
}

export function saveBankingReviewState(value: PersistedBankingReviewState) {
  return saveJsonState(BANKING_REVIEW_STATE_KEY, value);
}

export function loadBankingImportDraft() {
  return loadJsonState(BANKING_IMPORT_DRAFT_KEY, defaultBankingImportDraft);
}

export function saveBankingImportDraft(value: PersistedBankingImportDraft) {
  return saveJsonState(BANKING_IMPORT_DRAFT_KEY, value);
}