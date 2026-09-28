import { sendConfiguredEmail } from '@/lib/communication-settings';
import { siteBrandAssets } from '@/lib/site-branding';

interface Invoice {
  invoiceNumber: string;
  total: number;
  issueDate: string;
  dueDate: string | null;
  status: string;
  user: {
    name: string | null;
    email: string;
  };
  container: {
    containerNumber: string;
  };
  lineItems: Array<{
    description: string;
    amount: number;
  }>;
}

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

type EmailTone = 'default' | 'info' | 'warning' | 'danger' | 'success';

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

function toInvoiceViewUrl(invoiceNumber: string) {
  return `${getBaseUrl()}/dashboard/invoices/${encodeURIComponent(invoiceNumber)}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(amount: number) {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
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

export const emailTemplates = {
  invoiceCreated: (invoice: Invoice) => ({
    subject: `Invoice ${invoice.invoiceNumber} - Payment Due`,
    html: renderEmailLayout({
      preheader: `Invoice ${invoice.invoiceNumber} is ready. Amount due ${formatCurrency(invoice.total)}.`,
      eyebrow: 'JACXI BILLING',
      title: `Invoice ${invoice.invoiceNumber}`,
      intro: `Dear ${invoice.user.name || 'Valued Customer'}, your invoice for container ${invoice.container.containerNumber} is ready.`,
      contentHtml: `
        ${renderSummaryTable([
          { label: 'Invoice Number', value: invoice.invoiceNumber, emphasize: true },
          {
            label: 'Issue Date',
            value: new Date(invoice.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          },
          {
            label: 'Due Date',
            value: invoice.dueDate
              ? new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
              : 'N/A',
          },
          { label: 'Container', value: invoice.container.containerNumber },
          { label: 'Total Amount', value: formatCurrency(invoice.total), emphasize: true },
        ])}
        ${invoice.lineItems?.length ? `
          <div style="margin-top:14px; border:1px solid ${EMAIL_THEME.border}; border-radius:10px; overflow:hidden;">
            <div style="padding:10px 12px; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; font-weight:700; color:${EMAIL_THEME.textSecondary}; background:${EMAIL_THEME.background}; border-bottom:1px solid ${EMAIL_THEME.border};">Line Items</div>
            ${invoice.lineItems
              .map(
                (item, index) => `<div style="display:flex; justify-content:space-between; gap:10px; padding:10px 12px; border-bottom:${index === invoice.lineItems.length - 1 ? 'none' : `1px solid ${EMAIL_THEME.border}`};">
                    <span style="font-size:13px; color:${EMAIL_THEME.textSecondary};">${escapeHtml(item.description)}</span>
                    <span style="font-size:13px; color:${EMAIL_THEME.textPrimary}; font-weight:600;">${formatCurrency(item.amount)}</span>
                  </div>`,
              )
              .join('')}
          </div>
        ` : ''}
      `,
      ctaLabel: 'View Invoice',
      ctaUrl: toInvoiceViewUrl(invoice.invoiceNumber),
      footerNote: 'For invoice support, contact billing@jacxishipping.com.',
      tone: 'info',
    }),
    text: `
Invoice ${invoice.invoiceNumber}

Dear ${invoice.user.name || 'Valued Customer'},

Your invoice for container ${invoice.container.containerNumber} is ready.

Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}
- Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
- Container: ${invoice.container.containerNumber}
- Total Amount: ${formatCurrency(invoice.total)}

View your invoice online: ${toInvoiceViewUrl(invoice.invoiceNumber)}

If you have any questions, please contact us.

Thank you for your business!
    `,
  }),

  paymentReminder: (invoice: Invoice, daysUntilDue: number) => ({
    subject: `Reminder: Invoice ${invoice.invoiceNumber} Due ${daysUntilDue > 0 ? `in ${daysUntilDue} Days` : 'Today'}`,
    html: renderEmailLayout({
      preheader: `Invoice ${invoice.invoiceNumber} payment reminder: ${daysUntilDue > 0 ? `${daysUntilDue} day(s) remaining` : 'due today'}.`,
      eyebrow: 'JACXI BILLING',
      title: 'Payment reminder',
      intro: `Dear ${invoice.user.name || 'Valued Customer'}, this is a reminder that invoice ${invoice.invoiceNumber} is ${daysUntilDue > 0 ? `due in ${daysUntilDue} day(s)` : 'due today'}.`,
      contentHtml: `
        <div style="margin-bottom:12px; padding:10px 12px; border-radius:8px; border:1px solid ${EMAIL_THEME.warning}; background:rgba(245, 158, 11, 0.08); color:${EMAIL_THEME.textPrimary}; font-size:13px; font-weight:600;">
          Upcoming due date reminder.
        </div>
        ${renderSummaryTable([
          { label: 'Invoice Number', value: invoice.invoiceNumber, emphasize: true },
          { label: 'Amount Due', value: formatCurrency(invoice.total), emphasize: true },
          {
            label: 'Due Date',
            value: invoice.dueDate
              ? new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
              : 'N/A',
          },
          { label: 'Status', value: daysUntilDue > 0 ? `Due in ${daysUntilDue} day(s)` : 'Due today', emphasize: true },
        ])}
      `,
      ctaLabel: 'View & Pay Invoice',
      ctaUrl: toInvoiceViewUrl(invoice.invoiceNumber),
      footerNote: "If you've already paid, please disregard this reminder.",
      tone: 'warning',
    }),
    text: `Reminder: Invoice ${invoice.invoiceNumber} is ${daysUntilDue > 0 ? `due in ${daysUntilDue} day(s)` : 'due today'}. Amount due: ${formatCurrency(invoice.total)}.`,
  }),

  paymentConfirmation: (invoice: Invoice) => ({
    subject: `Payment Received - Invoice ${invoice.invoiceNumber}`,
    html: renderEmailLayout({
      preheader: `Payment received for invoice ${invoice.invoiceNumber}.`,
      eyebrow: 'JACXI BILLING',
      title: 'Payment received',
      intro: `Dear ${invoice.user.name || 'Valued Customer'}, thank you. We have received your payment.`,
      contentHtml: `
        ${renderSummaryTable([
          { label: 'Invoice Number', value: invoice.invoiceNumber, emphasize: true },
          { label: 'Amount Paid', value: formatCurrency(invoice.total), emphasize: true },
          {
            label: 'Payment Date',
            value: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          },
          { label: 'Container', value: invoice.container.containerNumber },
        ])}
      `,
      ctaLabel: 'Download Receipt',
      ctaUrl: toInvoiceViewUrl(invoice.invoiceNumber),
      footerNote: 'Thank you for your business. For support, contact billing@jacxishipping.com.',
      tone: 'success',
    }),
    text: `Payment received for invoice ${invoice.invoiceNumber}. Amount paid: ${formatCurrency(invoice.total)}.`,
  }),
};

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  try {
    return await sendConfiguredEmail({ to, subject, html, text });
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

export async function sendInvoiceCreatedEmail(invoice: Invoice) {
  const template = emailTemplates.invoiceCreated(invoice);
  return sendEmail({
    to: invoice.user.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

export async function sendPaymentReminderEmail(invoice: Invoice, daysUntilDue: number) {
  const template = emailTemplates.paymentReminder(invoice, daysUntilDue);
  return sendEmail({
    to: invoice.user.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

export async function sendPaymentConfirmationEmail(invoice: Invoice) {
  const template = emailTemplates.paymentConfirmation(invoice);
  return sendEmail({
    to: invoice.user.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}
