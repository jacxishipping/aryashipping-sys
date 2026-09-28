import { ProxyAgent, fetch as undiciFetch } from 'undici';

function normalizeEnvValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

type LotFetchProxyMode = 'template' | 'connect';

let cachedProxyAgent: ProxyAgent | null = null;

function getProxyModeEnv() {
  return process.env.LOT_FETCH_PROXY_MODE;
}

function getProxyUrlEnv() {
  return process.env.LOT_FETCH_PROXY_URL;
}

function getProxyUsernameEnv() {
  return process.env.LOT_FETCH_PROXY_USERNAME;
}

function getProxyPasswordEnv() {
  return process.env.LOT_FETCH_PROXY_PASSWORD;
}

function getProxyAuthTokenEnv() {
  return process.env.LOT_FETCH_PROXY_AUTH_TOKEN;
}

function getProxyAuthHeaderEnv() {
  return process.env.LOT_FETCH_PROXY_AUTH_HEADER;
}

function getProxyAuthSchemeEnv() {
  return process.env.LOT_FETCH_PROXY_AUTH_SCHEME;
}

function safeProxyHost(proxyUrl: string | undefined) {
  const normalized = normalizeEnvValue(proxyUrl);
  if (!normalized) return undefined;

  try {
    const url = new URL(/^[a-z]+:\/\//i.test(normalized) ? normalized : `http://${normalized}`);
    return url.host;
  } catch {
    return normalized;
  }
}

export function getLotFetchProxyDebugInfo() {
  return {
    configured: Boolean(normalizeEnvValue(getProxyUrlEnv()) && resolveProxyMode()),
    mode: resolveProxyMode() || null,
    host: safeProxyHost(getProxyUrlEnv()) || null,
    hasUsername: Boolean(normalizeEnvValue(getProxyUsernameEnv())),
    hasPassword: Boolean(normalizeEnvValue(getProxyPasswordEnv())),
    hasTemplateToken: Boolean(normalizeEnvValue(getProxyAuthTokenEnv())),
  };
}

function buildProxyRequestFailureMessage(mode: LotFetchProxyMode | undefined, error: unknown) {
  const reason = error instanceof Error ? error.message : String(error);

  if (mode === 'connect') {
    return `Outbound proxy request failed. Check LOT_FETCH_PROXY_URL, LOT_FETCH_PROXY_USERNAME, and LOT_FETCH_PROXY_PASSWORD. ${reason}`;
  }

  if (mode === 'template') {
    return `Template proxy request failed. Check LOT_FETCH_PROXY_URL and LOT_FETCH_PROXY_AUTH_TOKEN. ${reason}`;
  }

  return `Lot fetch request failed. ${reason}`;
}

function resolveProxyMode(): LotFetchProxyMode | undefined {
  const explicitMode = normalizeEnvValue(getProxyModeEnv())?.toLowerCase();
  if (explicitMode === 'template') return 'template';
  if (explicitMode === 'connect') return 'connect';

  if (normalizeEnvValue(getProxyUsernameEnv()) || normalizeEnvValue(getProxyPasswordEnv())) {
    return 'connect';
  }

  if (normalizeEnvValue(getProxyAuthTokenEnv())) {
    return 'template';
  }

  const proxyUrl = normalizeEnvValue(getProxyUrlEnv());
  if (!proxyUrl) return undefined;

  return proxyUrl.includes('{url}') ? 'template' : 'connect';
}

function buildProxyUrl(targetUrl: string) {
  const proxyUrl = normalizeEnvValue(getProxyUrlEnv());
  if (!proxyUrl) {
    throw new Error('LOT_FETCH_PROXY_URL is not configured.');
  }

  if (proxyUrl.includes('{url}')) {
    return proxyUrl.replaceAll('{url}', encodeURIComponent(targetUrl));
  }

  const separator = proxyUrl.includes('?') ? '&' : '?';
  return `${proxyUrl}${separator}url=${encodeURIComponent(targetUrl)}`;
}

function buildOutboundProxyUrl() {
  const proxyUrl = normalizeEnvValue(getProxyUrlEnv());
  if (!proxyUrl) {
    throw new Error('LOT_FETCH_PROXY_URL is not configured.');
  }

  const normalizedProxyUrl = /^[a-z]+:\/\//i.test(proxyUrl) ? proxyUrl : `http://${proxyUrl}`;
  const url = new URL(normalizedProxyUrl);

  const username = normalizeEnvValue(getProxyUsernameEnv());
  const password = normalizeEnvValue(getProxyPasswordEnv());

  if (username) {
    url.username = username;
  }

  if (password) {
    url.password = password;
  }

  return url.toString();
}

function getProxyAgent() {
  if (!cachedProxyAgent) {
    cachedProxyAgent = new ProxyAgent(buildOutboundProxyUrl());
  }

  return cachedProxyAgent;
}

function applyProxyAuth(headers: Headers) {
  const token = normalizeEnvValue(getProxyAuthTokenEnv());
  if (!token) return;

  const headerName = normalizeEnvValue(getProxyAuthHeaderEnv()) || 'authorization';
  const authSchemeEnv = getProxyAuthSchemeEnv();
  const authScheme = authSchemeEnv === undefined ? 'Bearer' : authSchemeEnv.trim();
  const headerValue = authScheme ? `${authScheme} ${token}` : token;
  headers.set(headerName, headerValue);
}

export type LotFetchHtmlResult = {
  html: string;
  response: {
    ok: boolean;
    status: number;
  };
  viaProxy: boolean;
  requestUrl: string;
};

export function hasLotFetchProxy() {
  return Boolean(normalizeEnvValue(getProxyUrlEnv()) && resolveProxyMode());
}

export async function fetchLotHtml(targetUrl: string, requestHeaders: HeadersInit, useProxy = false): Promise<LotFetchHtmlResult> {
  const headers = new Headers(requestHeaders);
  const proxyMode = useProxy ? resolveProxyMode() : undefined;
  const requestUrl = useProxy && proxyMode === 'template' ? buildProxyUrl(targetUrl) : targetUrl;

  if (useProxy && proxyMode === 'template') {
    applyProxyAuth(headers);
  }

  let response;

  try {
    response = proxyMode === 'connect'
      ? await undiciFetch(targetUrl, {
          headers,
          dispatcher: getProxyAgent(),
        })
      : await fetch(requestUrl, {
          headers,
          cache: 'no-store',
        });
  } catch (error) {
    throw new Error(buildProxyRequestFailureMessage(proxyMode, error));
  }

  return {
    html: await response.text(),
    response: {
      ok: response.ok,
      status: response.status,
    },
    viaProxy: useProxy,
    requestUrl: targetUrl,
  };
}