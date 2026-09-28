import { NextRequest, NextResponse } from 'next/server';
import { routeDeps } from '@/lib/route-deps';
import {
  canManagePartnerPortals,
  canReadPartnerPortalCustomers,
  canReadPartnerPortalShipments,
  getPartnerPortalMembership,
  getPortalMembershipCustomerScope,
  getPartnerPortalOrThrow,
} from '@/lib/partner-portals';

const outstandingInvoiceStatuses = new Set(['PENDING', 'SENT', 'OVERDUE']);

function csvEscape(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);
  if (!/[",\n]/.test(stringValue)) {
    return stringValue;
  }

  return `"${stringValue.replace(/"/g, '""')}"`;
}

function parseDateParam(value: string | null, boundary: 'start' | 'end') {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  return new Date(boundary === 'start' ? `${value}T00:00:00.000Z` : `${value}T23:59:59.999Z`);
}

function isWithinDateRange(date: Date, startDate: Date | null, endDate: Date | null) {
  if (startDate && date < startDate) {
    return false;
  }

  if (endDate && date > endDate) {
    return false;
  }

  return true;
}

function createAgingBuckets() {
  return {
    current: { count: 0, amount: 0 },
    days1to30: { count: 0, amount: 0 },
    days31to60: { count: 0, amount: 0 },
    days61to90: { count: 0, amount: 0 },
    days90plus: { count: 0, amount: 0 },
  };
}

function formatShipmentReference(shipment: {
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleVIN: string | null;
}) {
  const label = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ').trim();

  if (shipment.vehicleVIN && label) {
    return `${label} (${shipment.vehicleVIN})`;
  }

  return shipment.vehicleVIN || label || 'Shipment';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string; customerId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId, customerId } = await params;
    const activityStartDateValue = request.nextUrl.searchParams.get('activityStartDate');
    const activityEndDateValue = request.nextUrl.searchParams.get('activityEndDate');
    const activityStartDate = parseDateParam(activityStartDateValue, 'start');
    const activityEndDate = parseDateParam(activityEndDateValue, 'end');
    const format = request.nextUrl.searchParams.get('format');

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const portal = await getPartnerPortalOrThrow(portalId);

    if (!portal) {
      return NextResponse.json({ error: 'Partner portal not found' }, { status: 404 });
    }

    const membership = await getPartnerPortalMembership(portalId, session.user.id);
    const hasInternalAccess = canManagePartnerPortals(session.user.role)
      || canReadPartnerPortalCustomers(session.user.role)
      || canReadPartnerPortalShipments(session.user.role);
    const scopedCustomerId = getPortalMembershipCustomerScope(membership);

    if (!membership && !hasInternalAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (scopedCustomerId && scopedCustomerId !== customerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const customer = await routeDeps.prisma.partnerCustomer.findFirst({
      where: {
        id: customerId,
        portalId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        country: true,
        notes: true,
        createdAt: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Portal customer not found' }, { status: 404 });
    }

    const [assignments, portalLedgerEntries, portalPaymentRecords] = await Promise.all([
      routeDeps.prisma.partnerShipmentAssignment.findMany({
        where: {
          portalId,
          partnerCustomerId: customerId,
        },
        orderBy: { assignedAt: 'desc' },
        select: {
          id: true,
          assignedAt: true,
          notes: true,
          shipment: {
            select: {
              id: true,
              paymentStatus: true,
              vehicleYear: true,
              vehicleMake: true,
              vehicleModel: true,
              vehicleVIN: true,
              invoices: {
                where: { status: { not: 'CANCELLED' } },
                orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
                select: {
                  id: true,
                  invoiceNumber: true,
                  status: true,
                  issueDate: true,
                  dueDate: true,
                  paidDate: true,
                  total: true,
                  paymentMethod: true,
                  paymentReference: true,
                  lineItems: {
                    select: {
                      id: true,
                      description: true,
                      amount: true,
                      shipmentId: true,
                    },
                  },
                },
              },
              charges: {
                where: {
                  invoiceId: null,
                  status: {
                    in: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'],
                  },
                },
                orderBy: [{ billableAt: 'asc' }, { createdAt: 'asc' }],
                select: {
                  id: true,
                  chargeCode: true,
                  category: true,
                  description: true,
                  billingMilestone: true,
                  status: true,
                  totalAmount: true,
                  billableAt: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      }),
      routeDeps.prisma.partnerPortalLedgerEntry.findMany({
        where: {
          portalId,
          partnerCustomerId: customerId,
        },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          shipmentId: true,
          paymentRecordId: true,
          transactionDate: true,
          description: true,
          type: true,
          amount: true,
          balance: true,
          paymentMethod: true,
          reference: true,
          notes: true,
          createdAt: true,
          shipment: {
            select: {
              id: true,
              vehicleYear: true,
              vehicleMake: true,
              vehicleModel: true,
              vehicleVIN: true,
            },
          },
        },
      }),
      routeDeps.prisma.partnerPortalPaymentRecord.findMany({
        where: {
          portalId,
          partnerCustomerId: customerId,
        },
        orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          shipmentId: true,
          amount: true,
          paymentDate: true,
          paymentMethod: true,
          reference: true,
          notes: true,
          createdAt: true,
          shipment: {
            select: {
              id: true,
              vehicleYear: true,
              vehicleMake: true,
              vehicleModel: true,
              vehicleVIN: true,
            },
          },
        },
      }),
    ]);

    const today = new Date();
    const aging = createAgingBuckets();
    const portalShipmentFinanceMap = new Map<string, { debitAmount: number; creditAmount: number; balance: number }>();

    for (const entry of portalLedgerEntries) {
      if (!entry.shipmentId) {
        continue;
      }

      const existing = portalShipmentFinanceMap.get(entry.shipmentId) || { debitAmount: 0, creditAmount: 0, balance: 0 };
      if (entry.type === 'DEBIT') {
        existing.debitAmount += entry.amount;
      } else {
        existing.creditAmount += entry.amount;
      }
      existing.balance = existing.debitAmount - existing.creditAmount;
      portalShipmentFinanceMap.set(entry.shipmentId, existing);
    }

    const portalLedgerSummary = {
      balance: portalLedgerEntries[0]?.balance || 0,
      debitAmount: portalLedgerEntries.filter((entry) => entry.type === 'DEBIT').reduce((sum, entry) => sum + entry.amount, 0),
      creditAmount: portalLedgerEntries.filter((entry) => entry.type === 'CREDIT').reduce((sum, entry) => sum + entry.amount, 0),
      paymentRecordCount: portalPaymentRecords.length,
      ledgerEntryCount: portalLedgerEntries.length,
    };

    const filteredPortalLedgerEntries = portalLedgerEntries.filter((entry) => (
      isWithinDateRange(entry.transactionDate, activityStartDate, activityEndDate)
    ));

    const filteredPortalPaymentRecords = portalPaymentRecords.filter((payment) => (
      isWithinDateRange(payment.paymentDate, activityStartDate, activityEndDate)
    ));

    const activitySummary = {
      debitAmount: filteredPortalLedgerEntries.filter((entry) => entry.type === 'DEBIT').reduce((sum, entry) => sum + entry.amount, 0),
      creditAmount: filteredPortalLedgerEntries.filter((entry) => entry.type === 'CREDIT').reduce((sum, entry) => sum + entry.amount, 0),
      paymentRecordCount: filteredPortalPaymentRecords.length,
      ledgerEntryCount: filteredPortalLedgerEntries.length,
    };

    const invoices = assignments.flatMap((assignment) => {
      const shipmentReference = formatShipmentReference(assignment.shipment);
      return assignment.shipment.invoices.map((invoice) => {
        const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
        const rawDaysOverdue = dueDate
          ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        const daysOverdue = rawDaysOverdue !== null ? Math.max(0, rawDaysOverdue) : null;
        const isOutstanding = outstandingInvoiceStatuses.has(invoice.status);

        if (isOutstanding) {
          if (rawDaysOverdue === null || rawDaysOverdue < 0) {
            aging.current.count += 1;
            aging.current.amount += invoice.total;
          } else if (rawDaysOverdue <= 30) {
            aging.days1to30.count += 1;
            aging.days1to30.amount += invoice.total;
          } else if (rawDaysOverdue <= 60) {
            aging.days31to60.count += 1;
            aging.days31to60.amount += invoice.total;
          } else if (rawDaysOverdue <= 90) {
            aging.days61to90.count += 1;
            aging.days61to90.amount += invoice.total;
          } else {
            aging.days90plus.count += 1;
            aging.days90plus.amount += invoice.total;
          }
        }

        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          total: invoice.total,
          issueDate: invoice.issueDate.toISOString(),
          dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
          paidDate: invoice.paidDate ? invoice.paidDate.toISOString() : null,
          daysOverdue,
          paymentMethod: invoice.paymentMethod || null,
          paymentReference: invoice.paymentReference || null,
          shipmentId: assignment.shipment.id,
          shipmentReference,
          lineItemCount: invoice.lineItems.filter((lineItem) => !lineItem.shipmentId || lineItem.shipmentId === assignment.shipment.id).length,
        };
      });
    }).sort((left, right) => right.issueDate.localeCompare(left.issueDate));

    const unbilledCharges = assignments.flatMap((assignment) => {
      const shipmentReference = formatShipmentReference(assignment.shipment);
      return assignment.shipment.charges.map((charge) => ({
        id: charge.id,
        shipmentId: assignment.shipment.id,
        shipmentReference,
        chargeCode: charge.chargeCode,
        category: charge.category,
        description: charge.description,
        billingMilestone: charge.billingMilestone,
        status: charge.status,
        totalAmount: charge.totalAmount,
        billableAt: charge.billableAt ? charge.billableAt.toISOString() : null,
        createdAt: charge.createdAt.toISOString(),
      }));
    });

    const summary = {
      linkedShipmentCount: assignments.length,
      invoiceCount: invoices.length,
      openInvoiceCount: invoices.filter((invoice) => outstandingInvoiceStatuses.has(invoice.status)).length,
      overdueInvoiceCount: invoices.filter((invoice) => outstandingInvoiceStatuses.has(invoice.status) && (invoice.daysOverdue ?? 0) > 0).length,
      outstandingAmount: invoices.filter((invoice) => outstandingInvoiceStatuses.has(invoice.status)).reduce((sum, invoice) => sum + invoice.total, 0),
      overdueAmount: invoices.filter((invoice) => outstandingInvoiceStatuses.has(invoice.status) && (invoice.daysOverdue ?? 0) > 0).reduce((sum, invoice) => sum + invoice.total, 0),
      paidAmount: invoices.filter((invoice) => invoice.status === 'PAID').reduce((sum, invoice) => sum + invoice.total, 0),
      unbilledAmount: unbilledCharges.reduce((sum, charge) => sum + charge.totalAmount, 0),
      unbilledChargeCount: unbilledCharges.length,
    };

    if (format === 'csv') {
      const csvRows: string[] = [
        ['Portal', csvEscape(portal.companyLabel || portal.name)].join(','),
        ['Customer', csvEscape(customer.name)].join(','),
        ['Activity Start Date', csvEscape(activityStartDateValue)].join(','),
        ['Activity End Date', csvEscape(activityEndDateValue)].join(','),
        ['Current Portal-Only Balance', portalLedgerSummary.balance.toFixed(2)].join(','),
        ['Current Portal-Only Debits', portalLedgerSummary.debitAmount.toFixed(2)].join(','),
        ['Current Portal-Only Credits', portalLedgerSummary.creditAmount.toFixed(2)].join(','),
        ['Filtered Ledger Entries', String(activitySummary.ledgerEntryCount)].join(','),
        ['Filtered Payment Records', String(activitySummary.paymentRecordCount)].join(','),
        '',
        'Portal-Only Ledger Activity',
        [
          'Transaction Date',
          'Description',
          'Shipment',
          'Type',
          'Amount',
          'Running Balance',
          'Payment Method',
          'Reference',
          'Notes',
          'Created At',
        ].join(','),
        ...filteredPortalLedgerEntries.map((entry) => [
          csvEscape(entry.transactionDate.toISOString()),
          csvEscape(entry.description),
          csvEscape(entry.shipment ? formatShipmentReference(entry.shipment) : 'Customer-level entry'),
          entry.type,
          entry.amount.toFixed(2),
          entry.balance.toFixed(2),
          csvEscape(entry.paymentMethod),
          csvEscape(entry.reference),
          csvEscape(entry.notes),
          csvEscape(entry.createdAt.toISOString()),
        ].join(',')),
        '',
        'Portal-Only Payment Records',
        [
          'Payment Date',
          'Shipment',
          'Amount',
          'Payment Method',
          'Reference',
          'Notes',
          'Created At',
        ].join(','),
        ...filteredPortalPaymentRecords.map((payment) => [
          csvEscape(payment.paymentDate.toISOString()),
          csvEscape(payment.shipment ? formatShipmentReference(payment.shipment) : 'Customer-level payment'),
          payment.amount.toFixed(2),
          csvEscape(payment.paymentMethod),
          csvEscape(payment.reference),
          csvEscape(payment.notes),
          csvEscape(payment.createdAt.toISOString()),
        ].join(',')),
      ];

      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="partner-portal-customer-finance-${customer.id}-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      portal,
      customer,
      summary,
      aging,
      activityFilters: {
        activityStartDate: activityStartDateValue,
        activityEndDate: activityEndDateValue,
      },
      activitySummary,
      invoices,
      unbilledCharges,
      shipments: assignments.map((assignment) => ({
        id: assignment.shipment.id,
        reference: formatShipmentReference(assignment.shipment),
        paymentStatus: assignment.shipment.paymentStatus,
        portalPaymentStatus: (() => {
          const finance = portalShipmentFinanceMap.get(assignment.shipment.id);
          if (!finance || finance.debitAmount <= 0) {
            return 'PENDING';
          }
          if (finance.balance <= 0.001) {
            return 'PAID';
          }
          if (finance.creditAmount > 0) {
            return 'PARTIAL';
          }
          return 'PENDING';
        })(),
        portalBalance: portalShipmentFinanceMap.get(assignment.shipment.id)?.balance || 0,
        portalPaidAmount: portalShipmentFinanceMap.get(assignment.shipment.id)?.creditAmount || 0,
        assignedAt: assignment.assignedAt.toISOString(),
        notes: assignment.notes,
      })),
      portalLedgerSummary,
      portalLedgerEntries: filteredPortalLedgerEntries.map((entry) => ({
        id: entry.id,
        shipmentId: entry.shipmentId,
        shipmentReference: entry.shipment ? formatShipmentReference(entry.shipment) : null,
        paymentRecordId: entry.paymentRecordId,
        transactionDate: entry.transactionDate.toISOString(),
        description: entry.description,
        type: entry.type,
        amount: entry.amount,
        balance: entry.balance,
        paymentMethod: entry.paymentMethod,
        reference: entry.reference,
        notes: entry.notes,
        createdAt: entry.createdAt.toISOString(),
      })),
      portalPaymentRecords: filteredPortalPaymentRecords.map((payment) => ({
        id: payment.id,
        shipmentId: payment.shipmentId,
        shipmentReference: payment.shipment ? formatShipmentReference(payment.shipment) : null,
        amount: payment.amount,
        paymentDate: payment.paymentDate.toISOString(),
        paymentMethod: payment.paymentMethod,
        reference: payment.reference,
        notes: payment.notes,
        createdAt: payment.createdAt.toISOString(),
      })),
      viewer: {
        customerScoped: Boolean(scopedCustomerId),
        canManageFinance: !scopedCustomerId || hasInternalAccess,
        partnerCustomerId: scopedCustomerId,
      },
    });
  } catch (error) {
    routeDeps.logger.error('Failed to fetch partner portal customer finance detail', error);
    return NextResponse.json({ error: 'Failed to fetch partner portal customer finance detail' }, { status: 500 });
  }
}
