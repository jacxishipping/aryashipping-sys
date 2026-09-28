import { sendConfiguredEmail } from '@/lib/communication-settings';
import { siteBrandAssets } from '@/lib/site-branding';

const EMAIL_THEME = {
  accent: '#D4AF37',
  background: '#F9FAFB',
  panel: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#1C1C1E',
  textSecondary: '#5F6368',
  info: '#3B82F6',
  warning: '#F59E0B',
  error: '#EF4444',
  success: '#10B981',
} as const;

function getBaseUrl() {
  const candidates = [process.env.NEXT_PUBLIC_APP_URL?.trim(), process.env.NEXTAUTH_URL?.trim()].filter(Boolean) as string[];
  for (const candidate of candidates) {
    try {
      return new URL(candidate).origin;
    } catch {
      continue;
    }
  }
  return 'http://localhost:3000';
}

function toAbsoluteUrl(urlOrPath: string) {
  if (!urlOrPath) return '';
  try {
    return new URL(urlOrPath).toString();
  } catch {
    try {
      return new URL(urlOrPath, getBaseUrl()).toString();
    } catch {
      return urlOrPath;
    }
  }
}

function formatCurrency(amount: number) {
  return `$${amount.toFixed(2)}`;
}

type EmailTone = 'default' | 'info' | 'warning' | 'danger' | 'success';

function toneColor(tone: EmailTone) {
  if (tone === 'info') return EMAIL_THEME.info;
  if (tone === 'warning') return EMAIL_THEME.warning;
  if (tone === 'danger') return EMAIL_THEME.error;
  if (tone === 'success') return EMAIL_THEME.success;
  return EMAIL_THEME.accent;
}

function renderSummaryTable(rows: Array<{ label: string; value: string; emphasize?: boolean }>) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border: 1px solid ${EMAIL_THEME.border}; border-radius: 10px; overflow: hidden;">
      ${rows
        .map(
          (row, index) => `
            <tr>
              <td style="padding: 12px 14px; border-bottom: ${index === rows.length - 1 ? 'none' : `1px solid ${EMAIL_THEME.border}`}; color: ${EMAIL_THEME.textSecondary}; font-size: 13px; font-weight: 600; width: 42%;">
                ${escapeHtml(row.label)}
              </td>
              <td style="padding: 12px 14px; border-bottom: ${index === rows.length - 1 ? 'none' : `1px solid ${EMAIL_THEME.border}`}; color: ${row.emphasize ? EMAIL_THEME.textPrimary : EMAIL_THEME.textSecondary}; font-size: 14px; font-weight: ${row.emphasize ? 700 : 500}; text-align: right;">
                ${escapeHtml(row.value)}
              </td>
            </tr>
          `,
        )
        .join('')}
    </table>
  `;
}

function renderEmailLayout({
  preheader,
  eyebrow,
  title,
  intro,
  contentHtml,
  ctaLabel,
  ctaUrl,
  footerNote,
  tone = 'default',
}: {
  preheader: string;
  eyebrow: string;
  title: string;
  intro: string;
  contentHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
  tone?: EmailTone;
}) {
  const accent = toneColor(tone);
  const logoUrl = toAbsoluteUrl(siteBrandAssets.mainLogo);
  const safeCtaUrl = ctaUrl ? escapeHtml(toAbsoluteUrl(ctaUrl)) : '';

  return `
    <!doctype html>
    <html>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin:0; padding:0; background:${EMAIL_THEME.background}; font-family: Inter, Segoe UI, Arial, sans-serif; color:${EMAIL_THEME.textPrimary};">
        <span style="display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden;">
          ${escapeHtml(preheader)}
        </span>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${EMAIL_THEME.background}; padding: 28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px; border-radius:16px; overflow:hidden; border:1px solid ${EMAIL_THEME.border}; background:${EMAIL_THEME.panel}; box-shadow: 0 12px 36px rgba(28, 28, 30, 0.08);">
                <tr>
                  <td style="padding:22px 24px; background:linear-gradient(135deg, ${EMAIL_THEME.textPrimary} 0%, #2F3136 58%, ${accent} 160%); color:#FFFFFF;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align:middle;">
                          <div style="font-size:11px; letter-spacing:0.14em; text-transform:uppercase; opacity:0.84; font-weight:700; margin-bottom:8px;">
                            ${escapeHtml(eyebrow)}
                          </div>
                          <div style="font-size:24px; line-height:1.25; font-weight:700; margin-bottom:8px;">
                            ${escapeHtml(title)}
                          </div>
                          <div style="font-size:14px; line-height:1.5; opacity:0.9; max-width:460px;">
                            ${escapeHtml(intro)}
                          </div>
                        </td>
                        <td align="right" style="vertical-align:top; width:88px; padding-left:12px;">
                          <img src="${escapeHtml(logoUrl)}" alt="Jacxi Shipping" width="78" height="78" style="display:block; width:78px; height:78px; border-radius:12px; object-fit:cover; border:1px solid rgba(255,255,255,0.35); background:#FFFFFF;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px;">
                    ${contentHtml}
                    ${ctaLabel && safeCtaUrl ? `
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top: 22px;">
                      <tr>
                        <td>
                          <a href="${safeCtaUrl}" style="display:inline-block; padding:12px 20px; border-radius:10px; text-decoration:none; font-size:14px; font-weight:700; letter-spacing:0.01em; color:${EMAIL_THEME.textPrimary}; background:${EMAIL_THEME.accent}; border:1px solid ${EMAIL_THEME.accent};">
                            ${escapeHtml(ctaLabel)}
                          </a>
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px 22px; border-top:1px solid ${EMAIL_THEME.border}; color:${EMAIL_THEME.textSecondary}; font-size:12px; line-height:1.5;">
                    <div>${escapeHtml(footerNote || 'Questions? Contact support@jacxishipping.com.')}</div>
                    <div style="margin-top:4px;">Jacxi Shipping • Premium Logistics Workspace</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendInvoiceEmail({
  to,
  invoiceNumber,
  amount,
  dueDate,
  pdfUrl,
}: {
  to: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  pdfUrl: string;
}) {
  try {
    const amountLabel = formatCurrency(amount);
    return await sendConfiguredEmail({
      from: 'invoices@jacxishipping.com',
      to,
      subject: `Invoice ${invoiceNumber} - ${amountLabel}`,
      html: renderEmailLayout({
        preheader: `Invoice ${invoiceNumber} is ready. Amount due ${amountLabel}.`,
        eyebrow: 'JACXI BILLING',
        title: `Invoice ${invoiceNumber} is ready`,
        intro: 'Your billing statement has been generated and is available for review.',
        contentHtml: `
          ${renderSummaryTable([
            { label: 'Invoice Number', value: invoiceNumber, emphasize: true },
            { label: 'Amount Due', value: amountLabel, emphasize: true },
            { label: 'Due Date', value: dueDate },
          ])}
        `,
        ctaLabel: 'Download Invoice PDF',
        ctaUrl: pdfUrl,
        footerNote: 'Need help with this invoice? Contact billing@jacxishipping.com.',
        tone: 'info',
      }),
      text: `Invoice ${invoiceNumber} is ready. Amount due: ${amountLabel}. Due date: ${dueDate}. Download: ${pdfUrl}`,
    });
  } catch (error) {
    console.error('Email send failed:', error);
    return { success: false, error };
  }
}

export async function sendStatusUpdateEmail({
  to,
  containerNumber,
  status,
  message,
  trackingUrl,
}: {
  to: string;
  containerNumber: string;
  status: string;
  message: string;
  trackingUrl?: string;
}) {
  try {
    return await sendConfiguredEmail({
      from: 'tracking@jacxishipping.com',
      to,
      subject: `Container ${containerNumber} - ${status}`,
      html: renderEmailLayout({
        preheader: `Shipment ${containerNumber} status updated to ${status}.`,
        eyebrow: 'JACXI TRACKING',
        title: `Container ${containerNumber} update`,
        intro: `Status changed to ${status}.`,
        contentHtml: `
          <div style="border:1px solid ${EMAIL_THEME.border}; border-radius:10px; padding:14px 16px; background:${EMAIL_THEME.background}; margin-bottom:14px;">
            <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.08em; font-weight:700; color:${EMAIL_THEME.textSecondary}; margin-bottom:6px;">Latest Status</div>
            <div style="font-size:18px; font-weight:700; color:${EMAIL_THEME.textPrimary}; margin-bottom:8px;">${escapeHtml(status)}</div>
            <div style="font-size:14px; line-height:1.6; color:${EMAIL_THEME.textSecondary};">${escapeHtml(message)}</div>
          </div>
          ${renderSummaryTable([
            { label: 'Container', value: containerNumber, emphasize: true },
            { label: 'Current Status', value: status },
          ])}
        `,
        ctaLabel: trackingUrl ? 'Track Shipment' : undefined,
        ctaUrl: trackingUrl,
        footerNote: 'Questions? Contact support@jacxishipping.com.',
        tone: 'info',
      }),
      text: `Shipment update for container ${containerNumber}: ${status}. ${message}${trackingUrl ? ` Track here: ${trackingUrl}` : ''}`,
    });
  } catch (error) {
    console.error('Email send failed:', error);
    return { success: false, error };
  }
}

export async function sendPaymentReminderEmail({
  to,
  invoiceNumber,
  amount,
  dueDate,
  daysOverdue,
  pdfUrl,
}: {
  to: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  pdfUrl: string;
}) {
  try {
    const urgencyLevel = daysOverdue >= 30 ? 'urgent' : daysOverdue >= 14 ? 'high' : 'normal';
    const urgencyColor = urgencyLevel === 'urgent' ? '#dc2626' : urgencyLevel === 'high' ? '#ea580c' : '#f59e0b';
    const amountLabel = formatCurrency(amount);
    const tone: EmailTone = urgencyLevel === 'urgent' ? 'danger' : urgencyLevel === 'high' ? 'warning' : 'default';
    
    return await sendConfiguredEmail({
      from: 'invoices@jacxishipping.com',
      to,
      subject: `${urgencyLevel === 'urgent' ? 'URGENT: ' : ''}Payment Reminder - Invoice ${invoiceNumber}`,
      html: renderEmailLayout({
        preheader: `Invoice ${invoiceNumber} is ${daysOverdue} days overdue. Amount due ${amountLabel}.`,
        eyebrow: urgencyLevel === 'urgent' ? 'JACXI BILLING · URGENT' : 'JACXI BILLING',
        title: `Payment reminder: Invoice ${invoiceNumber}`,
        intro: `This invoice is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue. Please arrange payment as soon as possible.`,
        contentHtml: `
          <div style="margin-bottom:12px; padding:10px 12px; border-radius:8px; border:1px solid ${urgencyColor}; background:${urgencyLevel === 'urgent' ? 'rgba(220, 38, 38, 0.08)' : 'rgba(245, 158, 11, 0.08)'}; color:${EMAIL_THEME.textPrimary}; font-size:13px; font-weight:600;">
            ${urgencyLevel === 'urgent' ? 'Final reminder threshold reached.' : 'Friendly payment reminder.'}
          </div>
          ${renderSummaryTable([
            { label: 'Invoice Number', value: invoiceNumber, emphasize: true },
            { label: 'Amount Due', value: amountLabel, emphasize: true },
            { label: 'Original Due Date', value: dueDate },
            { label: 'Days Overdue', value: `${daysOverdue} day${daysOverdue === 1 ? '' : 's'}`, emphasize: true },
          ])}
        `,
        ctaLabel: 'Download Invoice',
        ctaUrl: pdfUrl,
        footerNote: 'For payment arrangements, contact billing@jacxishipping.com.',
        tone,
      }),
      text: `Payment reminder for invoice ${invoiceNumber}. Amount due: ${amountLabel}. Due date: ${dueDate}. Days overdue: ${daysOverdue}. Download: ${pdfUrl}`,
    });
  } catch (error) {
    console.error('Payment reminder email send failed:', error);
    return { success: false, error };
  }
}

export async function sendShipmentCreatedEmail({
  to,
  userName,
  vehicleInfo,
  trackingUrl,
}: {
  to: string;
  userName: string;
  vehicleInfo: string;
  trackingUrl?: string;
}) {
  try {
    return await sendConfiguredEmail({
      from: 'notifications@jacxishipping.com',
      to,
      subject: 'Shipment Created - Jacxi Shipping',
      html: renderEmailLayout({
        preheader: 'Your shipment has been created and is now active in Jacxi Shipping.',
        eyebrow: 'JACXI OPERATIONS',
        title: 'Shipment created successfully',
        intro: `Hello ${userName}, your vehicle shipment has been added to our system.`,
        contentHtml: `
          <div style="border:1px solid ${EMAIL_THEME.border}; border-radius:10px; padding:14px 16px; background:${EMAIL_THEME.background};">
            <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.08em; font-weight:700; color:${EMAIL_THEME.textSecondary}; margin-bottom:6px;">Vehicle Details</div>
            <div style="font-size:14px; line-height:1.65; color:${EMAIL_THEME.textPrimary};">${escapeHtml(vehicleInfo)}</div>
          </div>
        `,
        ctaLabel: trackingUrl ? 'Track Shipment' : undefined,
        ctaUrl: trackingUrl,
        footerNote: 'We will keep you updated at every key milestone. Need help? support@jacxishipping.com.',
        tone: 'success',
      }),
      text: `Hello ${userName}, your shipment has been created. Vehicle details: ${vehicleInfo}.${trackingUrl ? ` Track shipment: ${trackingUrl}` : ''}`,
    });
  } catch (error) {
    console.error('Shipment created email send failed:', error);
    return { success: false, error };
  }
}

export async function sendLedgerTransactionEmail({
  to,
  customerName,
  direction,
  amount,
  description,
  balance,
  transactionDate,
  notes,
}: {
  to: string;
  customerName?: string | null;
  direction: 'DEBIT' | 'CREDIT';
  amount: number;
  description: string;
  balance?: number | null;
  transactionDate?: Date | string | null;
  notes?: string | null;
}) {
  try {
    const effectiveName = customerName?.trim() || 'Customer';
    const directionLabel = direction === 'CREDIT' ? 'Payment/Credit' : 'Charge/Debit';
    const sign = direction === 'CREDIT' ? '-' : '+';
    const formattedAmount = formatCurrency(amount);
    const formattedBalance = typeof balance === 'number' ? formatCurrency(balance) : null;
    const transactionDateValue = transactionDate
      ? new Date(transactionDate).toLocaleString()
      : new Date().toLocaleString();
    const tone: EmailTone = direction === 'CREDIT' ? 'success' : 'warning';

    return await sendConfiguredEmail({
      from: 'billing@jacxishipping.com',
      to,
      subject: `Account Transaction Notice - ${directionLabel} ${formattedAmount}`,
      html: renderEmailLayout({
        preheader: `A ${directionLabel} transaction of ${sign}${formattedAmount} was posted to your account.`,
        eyebrow: 'JACXI FINANCE',
        title: 'Account transaction posted',
        intro: `Hello ${effectiveName}, a new transaction has been recorded on your account.`,
        contentHtml: renderSummaryTable([
          { label: 'Transaction Type', value: directionLabel },
          { label: 'Amount', value: `${sign}${formattedAmount}`, emphasize: true },
          { label: 'Description', value: description },
          { label: 'Date', value: transactionDateValue },
          ...(formattedBalance ? [{ label: 'Current Balance', value: formattedBalance, emphasize: true }] : []),
          ...(notes?.trim() ? [{ label: 'Notes', value: notes.trim() }] : []),
        ]),
        footerNote: 'If you have questions about this transaction, contact billing@jacxishipping.com.',
        tone,
      }),
      text: `Hello ${effectiveName}, a ${directionLabel} transaction of ${sign}${formattedAmount} was posted to your account on ${transactionDateValue}. Description: ${description}.${formattedBalance ? ` Current balance: ${formattedBalance}.` : ''}${notes?.trim() ? ` Notes: ${notes}.` : ''}`,
    });
  } catch (error) {
    console.error('Ledger transaction email send failed:', error);
    return { success: false, error };
  }
}
