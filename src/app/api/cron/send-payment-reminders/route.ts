import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendPaymentReminderEmail } from '@/lib/email';
import { validateCronRequest } from '@/lib/cron-auth';

// Phase 2: reminder days are configurable via env, falling back to [3, 7, 14, 30].
function getReminderDays(): number[] {
  const raw = process.env.INVOICE_REMINDER_DAYS;
  if (raw) {
    const parsed = raw.split(',').map((s) => parseInt(s.trim(), 10)).filter(Number.isFinite);
    if (parsed.length > 0) return parsed;
  }
  return [3, 7, 14, 30];
}

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  if (!validateCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date();
    const reminderDays = getReminderDays();

    // Find overdue invoices that are still pending or sent.
    // Phase 2: include OVERDUE as well, so invoices that have already been
    // marked overdue can still receive later reminders (7/14/30-day).
    const overdueInvoices = await prisma.userInvoice.findMany({
      where: {
        status: {
          in: ['PENDING', 'SENT', 'OVERDUE'],
        },
        dueDate: {
          lt: today,
        },
      },
      include: {
        user: true,
      },
    });

    const results: Array<{
      invoiceId: string;
      invoiceNumber: string;
      daysOverdue: number;
      emailSent: boolean;
      recipient?: string;
      error?: string;
    }> = [];
    let remindersSent = 0;
    const invoiceIdsToUpdateToOverdue: string[] = [];

    for (const invoice of overdueInvoices) {
      if (!invoice.dueDate) continue;

      const daysOverdue = Math.floor(
        (today.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24),
      );

      const shouldSendReminder =
        reminderDays.includes(daysOverdue) &&
        invoice.user.email &&
        // Phase 2: only send once per reminder-day. lastReminderDaysAgo stores
        // the daysOverdue at which the last reminder was sent.
        invoice.lastReminderDaysAgo !== daysOverdue;

      // Phase 2: per-invoice try/catch — one bad email no longer poisons the
      // entire cron batch (previous behaviour: a single throw 500'd the whole run).
      try {
        if (shouldSendReminder) {
          const pdfUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/invoices/${invoice.id}/pdf`;

          const emailResult = await sendPaymentReminderEmail({
            to: invoice.user.email,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.total,
            dueDate: new Date(invoice.dueDate).toLocaleDateString(),
            daysOverdue,
            pdfUrl,
          });

          if (emailResult.success) {
            remindersSent++;

            if (invoice.status !== 'OVERDUE') {
              invoiceIdsToUpdateToOverdue.push(invoice.id);
            }

            // Record which reminder-day was sent so the next run does not
            // double-send the same reminder.
            await prisma.userInvoice.update({
              where: { id: invoice.id },
              data: {
                lastReminderAt: today,
                lastReminderDaysAgo: daysOverdue,
                status: invoice.status === 'OVERDUE' ? 'OVERDUE' : invoice.status,
              },
            });

            results.push({
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              daysOverdue,
              emailSent: true,
              recipient: invoice.user.email,
            });
          } else {
            results.push({
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              daysOverdue,
              emailSent: false,
              error: 'Email send failed',
            });
          }
        }
      } catch (invoiceError) {
        // Phase 2: log and continue — do not abort the whole cron batch.
        console.error(
          `Payment reminder failed for invoice ${invoice.invoiceNumber}:`,
          invoiceError,
        );
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          daysOverdue,
          emailSent: false,
          error: invoiceError instanceof Error ? invoiceError.message : 'Unknown error',
        });
      }

      // Mark for OVERDUE even when no reminder is sent (e.g. user has no email).
      if (daysOverdue > 0 && invoice.status !== 'OVERDUE' && !invoiceIdsToUpdateToOverdue.includes(invoice.id)) {
        invoiceIdsToUpdateToOverdue.push(invoice.id);
      }
    }

    // Batch update invoice statuses to OVERDUE
    if (invoiceIdsToUpdateToOverdue.length > 0) {
      await prisma.userInvoice.updateMany({
        where: {
          id: { in: invoiceIdsToUpdateToOverdue },
        },
        data: {
          status: 'OVERDUE',
        },
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        overdueInvoicesChecked: overdueInvoices.length,
        remindersSent: remindersSent,
        statusUpdatedToOverdue: invoiceIdsToUpdateToOverdue.length,
        reminderDays: reminderDays,
      },
      details: results,
    });
  } catch (error) {
    console.error('Payment reminder cron failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to process payment reminders',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
