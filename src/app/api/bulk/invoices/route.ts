import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NotificationType } from '@prisma/client';
import { createInvoiceAuditLogs } from '@/lib/entity-audit-history';
import { createNotifications } from '@/lib/notifications';
import { resetInvoiceShipmentCharges } from '@/lib/billing/shipment-charges';

const allowedStatuses = ['DRAFT', 'PENDING', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];

// POST: Bulk operations on invoices
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const actorId = session.user?.id;
    if (!actorId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (session.user?.role !== 'admin') {
      return NextResponse.json(
        { message: 'Forbidden: Only admins can perform bulk operations' },
        { status: 403 }
      );
    }

    const { action, invoiceIds, data } = await request.json();

    if (!action || !invoiceIds || !Array.isArray(invoiceIds)) {
      return NextResponse.json(
        { message: 'Action and invoiceIds array are required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'updateStatus': {
        const status = data?.status;
        if (!status || !allowedStatuses.includes(status)) {
          return NextResponse.json(
            { message: 'Invalid status for updateStatus action' },
            { status: 400 }
          );
        }

        const existingInvoices = await prisma.userInvoice.findMany({
          where: { id: { in: invoiceIds } },
          select: {
            id: true,
            userId: true,
            invoiceNumber: true,
            status: true,
          },
        });

        const result = await prisma.userInvoice.updateMany({
          where: { id: { in: invoiceIds } },
          data: { status },
        });

        try {
          const invoices = existingInvoices;

          const formattedStatus = status
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (char: string) => char.toUpperCase());

          await createNotifications(
            invoices.map((invoice) => ({
              userId: invoice.userId,
              senderId: actorId,
              title: 'Invoice status updated',
              description: `Invoice ${invoice.invoiceNumber} is now ${formattedStatus}.`,
              type: NotificationType.INFO,
              link: `/dashboard/invoices/${invoice.id}`,
            }))
          );

          await createInvoiceAuditLogs(
            invoices
              .filter((invoice) => invoice.status !== status)
              .map((invoice) => ({
                invoiceId: invoice.id,
                action: 'STATUS_CHANGE',
                description: `Invoice status changed from ${invoice.status} to ${status} through bulk update`,
                performedBy: actorId,
                oldValue: invoice.status,
                newValue: status,
              }))
          );
        } catch (notificationError) {
          console.error('Failed to create bulk invoice notifications:', notificationError);
        }

        return NextResponse.json({
          message: 'Bulk status update completed successfully',
          count: result.count,
        });
      }

      case 'delete': {
        const invoices = await prisma.userInvoice.findMany({
          where: { id: { in: invoiceIds } },
          select: {
            id: true,
            invoiceNumber: true,
            paymentReference: true,
            status: true,
          },
        });

        // Only un-issued invoices may be deleted. Issued invoices carry customer
        // and ledger state; they must be reversed (cancelled) instead, which keeps
        // the document for the audit trail and releases its charges.
        const lockedInvoices = invoices.filter(
          (invoice) => !['DRAFT', 'PENDING'].includes(invoice.status),
        );
        if (lockedInvoices.length > 0) {
          return NextResponse.json(
            {
              message: `Only draft or pending invoices can be deleted. Reverse these invoices first (this releases their charges while keeping the audit trail): ${lockedInvoices
                .map((invoice) => invoice.invoiceNumber)
                .join(', ')}`,
            },
            { status: 400 },
          );
        }

        const result = await prisma.$transaction(async (tx) => {

          const invoiceNumbers = invoices.map((invoice) => invoice.invoiceNumber);
          const paymentReferenceIds = invoices
            .map((invoice) => invoice.paymentReference)
            .filter((reference): reference is string => Boolean(reference));

          const userLedgerLinks = await tx.ledgerEntry.findMany({
            where: {
              OR: [
                ...invoices.map((invoice) => ({
                  metadata: {
                    path: ['invoiceId'],
                    equals: invoice.id,
                  },
                })),
                ...invoiceNumbers.map((invoiceNumber) => ({
                  metadata: {
                    path: ['invoiceNumber'],
                    equals: invoiceNumber,
                  },
                })),
                ...(paymentReferenceIds.length > 0
                  ? [
                      {
                        id: { in: paymentReferenceIds },
                      },
                    ]
                  : []),
              ],
            },
            select: { id: true },
          });

          const companyLedgerLinks = await tx.companyLedgerEntry.findMany({
            where: {
              OR: [
                ...invoices.map((invoice) => ({
                  metadata: {
                    path: ['invoiceId'],
                    equals: invoice.id,
                  },
                })),
                ...invoiceNumbers.map((invoiceNumber) => ({
                  metadata: {
                    path: ['invoiceNumber'],
                    equals: invoiceNumber,
                  },
                })),
                ...(invoiceNumbers.length > 0
                  ? [
                      {
                        reference: { in: invoiceNumbers },
                      },
                    ]
                  : []),
              ],
            },
            select: { id: true },
          });

          const userLedgerEntryIds = userLedgerLinks.map((entry) => entry.id);
          const companyLedgerEntryIds = companyLedgerLinks.map((entry) => entry.id);

          if (userLedgerEntryIds.length > 0) {
            await tx.ledgerEntry.deleteMany({
              where: { id: { in: userLedgerEntryIds } },
            });
          }

          if (companyLedgerEntryIds.length > 0) {
            await tx.companyLedgerEntry.deleteMany({
              where: { id: { in: companyLedgerEntryIds } },
            });
          }

          // Release any charges still linked to these draft invoices so they are
          // not orphaned (mirrors the single-invoice DELETE endpoint).
          for (const invoice of invoices) {
            await resetInvoiceShipmentCharges(tx, invoice.id);
          }

          const deletedInvoices = await tx.userInvoice.deleteMany({
            where: { id: { in: invoiceIds } },
          });

          return {
            count: deletedInvoices.count,
            removedUserLedgerEntries: userLedgerEntryIds.length,
            removedCompanyLedgerEntries: companyLedgerEntryIds.length,
          };
        });

        return NextResponse.json({
          message: 'Bulk delete completed successfully',
          count: result.count,
          removedUserLedgerEntries: result.removedUserLedgerEntries,
          removedCompanyLedgerEntries: result.removedCompanyLedgerEntries,
        });
      }

      case 'export': {
        const invoices = await prisma.userInvoice.findMany({
          where: { id: { in: invoiceIds } },
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            container: {
              select: {
                containerNumber: true,
              },
            },
          },
        });

        return NextResponse.json({
          message: 'Invoices exported successfully',
          data: invoices,
          count: invoices.length,
        });
      }

      default:
        return NextResponse.json(
          { message: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
