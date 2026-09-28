const CUSTOM_DOMAIN_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

function parseHostFromUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).host.split(':')[0].toLowerCase();
  } catch {
    return null;
  }
}

export function normalizeRequestHost(host: string | null | undefined) {
  if (!host) {
    return null;
  }

  return host.split(':')[0].trim().toLowerCase().replace(/\.$/, '') || null;
}

export function normalizePortalCustomDomain(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value.trim().toLowerCase().replace(/\.$/, '') || null;
}

export function isValidPortalCustomDomain(value: string) {
  return CUSTOM_DOMAIN_PATTERN.test(value) && !['localhost', '127.0.0.1'].includes(value);
}

export function getPortalCustomDomainVerificationHost(domain: string) {
  return `_jacxi-portal-verification.${domain}`;
}

export function getPortalCustomDomainVerificationValue(token: string) {
  return `jacxi-portal-verification=${token}`;
}

export function getSystemHosts() {
  const hosts = new Set<string>(['localhost', '127.0.0.1']);
  const configuredHosts = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.AUTH_URL,
  ];

  for (const configuredHost of configuredHosts) {
    const parsedHost = parseHostFromUrl(configuredHost);
    if (parsedHost) {
      hosts.add(parsedHost);
    }
  }

  if (process.env.VERCEL_URL) {
    hosts.add(process.env.VERCEL_URL.replace(/^https?:\/\//, '').split(':')[0].toLowerCase());
  }

  return hosts;
}

export function isSystemHost(host: string | null | undefined) {
  const normalizedHost = normalizeRequestHost(host);
  if (!normalizedHost) {
    return false;
  }

  const systemHosts = getSystemHosts();

  if (systemHosts.has(normalizedHost)) {
    return true;
  }

  if (normalizedHost.endsWith('.vercel.app') || normalizedHost.endsWith('.github.dev')) {
    return true;
  }

  // Check if the host is a subdomain of any system host.
  // Example: portal.jacxishipping.com is a subdomain of jacxishipping.com
  // (if jacxishipping.com is the main app domain configured on Vercel).
  for (const systemHost of systemHosts) {
    if (normalizedHost.endsWith(`.${systemHost}`)) {
      return true;
    }
  }

  return false;
}