import client from './client';
import {
  BankImportPreviewResponse,
  BankImportResult,
  BankItemSummary,
  BankingLedgerEntry,
  BankingLedgerResponse,
  CompanyLedgerEntry,
  CompanyLedgerEntryUpdateInput,
  CompanyLedgerSummary,
  DueAgingReportData,
  FilteredBankSummary,
  FinanceCompanyDetail,
  FinanceCompanySummary,
  FinancialReportData,
  FinancialReportType,
} from '../types/admin';

export interface CompaniesResponse {
  companies: FinanceCompanySummary[];
}

export interface CompanyDetailResponse {
  company: FinanceCompanyDetail;
  summary: CompanyLedgerSummary;
}

export interface CompanyLedgerResponse {
  entries: CompanyLedgerEntry[];
  summary: CompanyLedgerSummary;
}

export interface BankItemsResponse {
  configured: boolean;
  items: BankItemSummary[];
}

export interface UpdateLedgerEntryInput {
  description?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface PickedDocumentAsset {
  uri: string;
  name?: string;
  mimeType?: string | null;
  file?: unknown;
}

export const financeApi = {
  async getCompanies(params?: { search?: string; companyType?: 'SHIPPING' | 'DISPATCH' | 'TRANSIT' }): Promise<CompaniesResponse> {
    const response = await client.get<CompaniesResponse>('/api/finance/companies', {
      params,
    });

    return response.data;
  },

  async getCompany(id: string): Promise<CompanyDetailResponse> {
    const response = await client.get<CompanyDetailResponse>(`/api/finance/companies/${id}`);
    return response.data;
  },

  async getCompanyLedger(id: string, params?: { search?: string; type?: 'DEBIT' | 'CREDIT'; source?: 'BANK_IMPORT' | 'MANUAL' }): Promise<CompanyLedgerResponse> {
    const response = await client.get<CompanyLedgerResponse>(`/api/finance/companies/${id}/ledger`, {
      params,
    });

    return response.data;
  },

  async getBankItems(): Promise<BankItemsResponse> {
    try {
      const response = await client.get<{ items: BankItemSummary[] }>('/api/finicity/items');
      return {
        configured: true,
        items: response.data.items || [],
      };
    } catch (error: any) {
      if (error?.status === 503) {
        return {
          configured: false,
          items: [],
        };
      }

      throw error;
    }
  },

  async getBankingLedger(params?: {
    type?: 'DEBIT' | 'CREDIT';
    finicityCustomerId?: string;
    finicityAccountId?: string;
  }): Promise<BankingLedgerResponse> {
    const response = await client.get<BankingLedgerResponse>('/api/ledger', {
      params: {
        source: 'BANK_IMPORT',
        page: 1,
        limit: 200,
        ...params,
      },
    });

    return response.data;
  },

  async updateLedgerEntry(id: string, input: UpdateLedgerEntryInput): Promise<{ entry: BankingLedgerEntry }> {
    const response = await client.patch<{ entry: BankingLedgerEntry }>(`/api/ledger/${id}`, input);
    return response.data;
  },

  async updateCompanyLedgerEntry(entryId: string, input: CompanyLedgerEntryUpdateInput): Promise<{ entry: CompanyLedgerEntry }> {
    const response = await client.patch<{ entry: CompanyLedgerEntry }>(
      `/api/finance/companies/ledger/${entryId}`,
      input,
    );
    return response.data;
  },

  async getConnectUrl(): Promise<string> {
    const response = await client.post<{ connectUrl: string }>('/api/finicity/connect-url');
    return response.data.connectUrl;
  },

  async syncConnectedAccounts(itemId?: string): Promise<{ results: Array<{ importedCount?: number }> }> {
    const response = await client.post<{ results: Array<{ importedCount?: number }> }>('/api/finicity/sync', {
      ...(itemId ? { itemId } : {}),
      refresh: true,
    });

    return response.data;
  },

  async getFinancialReport(params: { type: FinancialReportType; startDate?: string; endDate?: string; userId?: string }): Promise<FinancialReportData> {
    const response = await client.get<FinancialReportData>('/api/reports/financial', {
      params,
    });

    return response.data;
  },

  async getDueAgingReport(params?: { userId?: string }): Promise<DueAgingReportData> {
    const response = await client.get<DueAgingReportData>('/api/reports/due-aging', {
      params,
    });

    return response.data;
  },

  async previewBankCsv(asset: PickedDocumentAsset, params?: { category?: string; sourceLabel?: string; statementEndingBalance?: string }): Promise<BankImportPreviewResponse> {
    const formData = new FormData();
    formData.append('action', 'preview');
    formData.append('category', params?.category || 'Bank Statement');
    formData.append('sourceLabel', params?.sourceLabel || 'Bank of America CSV');
    formData.append('statementEndingBalance', params?.statementEndingBalance || '');

    const webFile = asset.file;
    if (webFile) {
      (formData as any).append('file', webFile as Blob, asset.name || 'bank-import.csv');
    } else {
      formData.append('file', {
        uri: asset.uri,
        name: asset.name || 'bank-import.csv',
        type: asset.mimeType || 'text/csv',
      } as any);
    }

    const response = await client.post<BankImportPreviewResponse>('/api/ledger/import-bank-csv', formData);
    return response.data;
  },

  async importBankCsv(asset: PickedDocumentAsset, params?: { category?: string; sourceLabel?: string; statementEndingBalance?: string }): Promise<BankImportResult> {
    const formData = new FormData();
    formData.append('action', 'import');
    formData.append('category', params?.category || 'Bank Statement');
    formData.append('sourceLabel', params?.sourceLabel || 'Bank of America CSV');
    formData.append('statementEndingBalance', params?.statementEndingBalance || '');

    const webFile = asset.file;
    if (webFile) {
      (formData as any).append('file', webFile as Blob, asset.name || 'bank-import.csv');
    } else {
      formData.append('file', {
        uri: asset.uri,
        name: asset.name || 'bank-import.csv',
        type: asset.mimeType || 'text/csv',
      } as any);
    }

    const response = await client.post<BankImportResult>('/api/ledger/import-bank-csv', formData);
    return response.data;
  },
};