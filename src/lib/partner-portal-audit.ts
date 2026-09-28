type AuditChanges = Record<string, unknown> | null | undefined;

export function maskEmailAddress(email: string | null | undefined) {
  if (!email) {
    return null;
  }

  const [localPart, domain = ''] = email.split('@');
  if (!localPart) {
    return email;
  }

  if (localPart.length <= 2) {
    return `${localPart[0] || '*'}***@${domain}`;
  }

  return `${localPart.slice(0, 2)}***@${domain}`;
}

export function sanitizeLoginCodeAuditChanges(changes: AuditChanges) {
  if (!changes) {
    return undefined;
  }

  const nextChanges = { ...changes };

  if (typeof nextChanges.email === 'string') {
    nextChanges.email = maskEmailAddress(nextChanges.email);
  }

  for (const key of Object.keys(nextChanges)) {
    if (/logincode|code|token/i.test(key)) {
      nextChanges[key] = '[REDACTED]';
    }
  }

  return nextChanges;
}