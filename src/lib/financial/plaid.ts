import { Configuration, CountryCode, PlaidApi, PlaidEnvironments, Products } from 'plaid';

const plaidEnvironmentMap = {
  sandbox: PlaidEnvironments.sandbox,
  development: PlaidEnvironments.development,
  production: PlaidEnvironments.production,
} as const;

let plaidClient: PlaidApi | null = null;

export function isPlaidConfigured() {
  return Boolean(
    process.env.PLAID_CLIENT_ID?.trim() &&
    process.env.PLAID_SECRET?.trim() &&
    process.env.PLAID_ENCRYPTION_KEY?.trim()
  );
}

export function getPlaidEnvironment() {
  const value = process.env.PLAID_ENV?.trim().toLowerCase() || 'sandbox';
  return plaidEnvironmentMap[value as keyof typeof plaidEnvironmentMap] || PlaidEnvironments.sandbox;
}

export function getPlaidClient() {
  if (!isPlaidConfigured()) {
    throw new Error('Plaid is not configured');
  }

  if (!plaidClient) {
    const configuration = new Configuration({
      basePath: getPlaidEnvironment(),
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID as string,
          'PLAID-SECRET': process.env.PLAID_SECRET as string,
        },
      },
    });

    plaidClient = new PlaidApi(configuration);
  }

  return plaidClient;
}

export function getPlaidWebhookUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!baseUrl) {
    return undefined;
  }

  return `${baseUrl.replace(/\/$/, '')}/api/plaid/webhook`;
}

export const PLAID_PRODUCTS: Products[] = [Products.Transactions];
export const PLAID_COUNTRY_CODES: CountryCode[] = [CountryCode.Us];