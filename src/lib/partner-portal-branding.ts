const DEFAULT_PORTAL_ACCENT = '#0f766e';

export function normalizePortalAccentColor(color?: string | null) {
  if (!color) {
    return DEFAULT_PORTAL_ACCENT;
  }

  const normalized = color.trim();
  if (!/^#([0-9a-fA-F]{6})$/.test(normalized)) {
    return DEFAULT_PORTAL_ACCENT;
  }

  return normalized.toLowerCase();
}

export function hexToRgbChannels(hexColor?: string | null) {
  const color = normalizePortalAccentColor(hexColor).replace('#', '');
  const red = Number.parseInt(color.slice(0, 2), 16);
  const green = Number.parseInt(color.slice(2, 4), 16);
  const blue = Number.parseInt(color.slice(4, 6), 16);
  return `${red}, ${green}, ${blue}`;
}

export function getPortalBrandIdentity<T extends {
  name?: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
}>(portal: T | null | undefined) {
  return {
    name: portal?.name || 'Portal Workspace',
    companyLabel: portal?.companyLabel?.trim() || portal?.name || 'Partner Workspace',
    accentColor: normalizePortalAccentColor(portal?.accentColor),
    accentRgb: hexToRgbChannels(portal?.accentColor),
    logoUrl: portal?.logoUrl?.trim() || null,
  };
}