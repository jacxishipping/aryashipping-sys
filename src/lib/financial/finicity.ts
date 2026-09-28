type FinicityTokenResponse = {
  token: string;
};

export interface FinicityConnectUrlResponse {
  link: string;
}

export interface FinicityCustomer {
  id: string;
  username: string;
  createdDate: string;
}

export interface FinicityCustomerAccount {
  id: string;
  accountNumberDisplay: string;
  realAccountNumberLast4?: string;
  name: string;
  balance?: number;
  type: string;
  status: string;
  customerId: string;
  institutionId: string;
  institutionLoginId: number;
  currency: string;
  createdDate: number;
  aggregationAttemptDate?: number;
  aggregationSuccessDate?: number;
  balanceDate?: number;
  detail?: {
    availableBalanceAmount?: number;
  };
}

export interface FinicityCustomerAccountsResponse {
  accounts: FinicityCustomerAccount[];
}

export interface FinicityTransaction {
  id: string;
  uniqueTransactionId?: string;
  amount: number;
  accountId: string | number;
  customerId: string | number;
  status: string;
  description: string;
  memo?: string;
  type?: string;
  transactionDate?: number;
  postedDate?: number;
  createdDate: number;
  checkNum?: string;
  categorization?: {
    normalizedPayeeName?: string;
    category?: string;
    bestRepresentation?: string;
  };
  runningBalanceAmount?: number;
}

export interface FinicityTransactionsResponse {
  found: number;
  displaying: number;
  moreAvailable: boolean;
  fromDate: string;
  toDate: string;
  sort: string;
  transactions: FinicityTransaction[];
}

type FinicityErrorPayload = {
  code?: string | number;
  message?: string;
};

class FinicityError extends Error {
  status: number;
  code?: string | number;

  constructor(message: string, status: number, code?: string | number) {
    super(message);
    this.name = 'FinicityError';
    this.status = status;
    this.code = code;
  }
}

type CachedToken = {
  value: string;
  expiresAt: number;
};

let cachedToken: CachedToken | null = null;

function getEnv(name: string) {
  return process.env[name]?.trim();
}

export function isFinicityConfigured() {
  return Boolean(
    getEnv('FINICITY_PARTNER_ID') &&
    getEnv('FINICITY_PARTNER_SECRET') &&
    getEnv('FINICITY_APP_KEY') &&
    (getEnv('BANK_PROVIDER_ENCRYPTION_KEY') || getEnv('FINICITY_ENCRYPTION_KEY') || getEnv('PLAID_ENCRYPTION_KEY'))
  );
}

export function getFinicityApiBaseUrl() {
  return getEnv('FINICITY_BASE_URL') || 'https://api.finicity.com';
}

export function getFinicityPartnerId() {
  const value = getEnv('FINICITY_PARTNER_ID');

  if (!value) {
    throw new Error('FINICITY_PARTNER_ID is not configured');
  }

  return value;
}

export function getFinicityConnectRedirectUrl() {
  const baseUrl = getEnv('NEXT_PUBLIC_APP_URL');

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL is not configured');
  }

  return `${baseUrl.replace(/\/$/, '')}/dashboard/finance/banking/finicity-return`;
}

async function parseFinicityError(response: Response) {
  const text = await response.text();

  try {
    const payload = JSON.parse(text) as FinicityErrorPayload;
    return new FinicityError(payload.message || 'Finicity request failed', response.status, payload.code);
  } catch {
    return new FinicityError(text || 'Finicity request failed', response.status);
  }
}

export async function getFinicityAppToken() {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.value;
  }

  const partnerId = getEnv('FINICITY_PARTNER_ID');
  const partnerSecret = getEnv('FINICITY_PARTNER_SECRET');
  const appKey = getEnv('FINICITY_APP_KEY');

  if (!partnerId || !partnerSecret || !appKey) {
    throw new Error('Finicity partner credentials are not configured');
  }

  const response = await fetch(`${getFinicityApiBaseUrl()}/aggregation/v2/partners/authentication`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Finicity-App-Key': appKey,
    },
    body: JSON.stringify({
      partnerId,
      partnerSecret,
    }),
  });

  if (!response.ok) {
    throw await parseFinicityError(response);
  }

  const data = (await response.json()) as FinicityTokenResponse;
  cachedToken = {
    value: data.token,
    expiresAt: now + 90 * 60 * 1000,
  };

  return data.token;
}

export async function finicityRequest<T>(path: string, init: RequestInit = {}) {
  const token = await getFinicityAppToken();
  const appKey = getEnv('FINICITY_APP_KEY');

  if (!appKey) {
    throw new Error('FINICITY_APP_KEY is not configured');
  }

  const response = await fetch(`${getFinicityApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Finicity-App-Key': appKey,
      'Finicity-App-Token': token,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    throw await parseFinicityError(response);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export function getFinicityBankImportSource() {
  return 'FINICITY_TRANSACTIONS' as const;
}