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
  { params }: { params: Promise<{ portalId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId } = await params;

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

    const format = request.nextUrl.searchParams.get('format');

    const [customers, assignments, portalLedgerEntries, portalPaymentRecords] = await Promise.all([
      routeDeps.prisma.partnerCustomer.findMany({
        where: {
          portalId,
          ...(scopedCustomerId ? { id: scopedCustomerId } : {}),
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          city: true,
          country: true,
          createdAt: true,
          _count: {
            select: { shipmentAssignments: true },
          },
        },
      }),
      routeDeps.prisma.partnerShipmentAssignment.findMany({
        where: {
          portalId,
          partnerCustomerId: { not: null },
          ...(scopedCustomerId ? { partnerCustomerId: scopedCustomerId } : {}),
        },
        orderBy: { assignedAt: 'desc' },
        select: {
          id: true,
          partnerCustomerId: true,
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
                },
              },
              charges: {
                where: {
                  invoiceId: null,
                  status: {
                    in: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'],
                  },
                },
                select: {
                  id: true,
                  totalAmount: true,
                },
              },
            },
          },
        },
      }),
      routeDeps.prisma.partnerPortalLedgerEntry.findMany({
        where: {
          portalId,
          ...(scopedCustomerId ? { partnerCustomerId: scopedCustomerId } : {}),
        },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          partnerCustomerId: true,
          type: true,
          amount: true,
          balance: true,
        },
      }),
      routeDeps.prisma.partnerPortalPaymentRecord.findMany({
        where: {
          portalId,
          ...(scopedCustomerId ? { partnerCustomerId: scopedCustomerId } : {}),
        },
        orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          partnerCustomerId: true,
          amount: true,
        },
      }),
    ]);

    const today = new Date();
    const customerMap = new Map(
      customers.map((customer) => [customer.id, {
        ...customer,
        linkedShipmentCount: customer._count?.shipmentAssignments || 0,
        invoiceCount: 0,
        openInvoiceCount: 0,
        overdueInvoiceCount: 0,
        outstandingAmount: 0,
        overdueAmount: 0,
        paidAmount: 0,
        unbilledAmount: 0,
        unbilledChargeCount: 0,
        portalBalance: 0,
        portalDebitAmount: 0,
        portalCreditAmount: 0,
        portalPaymentRecordCount: 0,
        portalLedgerEntryCount: 0,
        lastInvoiceDate: null as string | null,
      }])
    );
    const invoiceRows: Array<{
      id: string;
      invoiceNumber: string;
      status: string;
      total: number;
      issueDate: string;
      dueDate: string | null;
      paidDate: string | null;
      daysOverdue: number | null;
      customerId: string;
      customerName: string;
      shipmentId: string;
      shipmentReference: string;
      paymentMethod: string | null;
      paymentReference: string | null;
    }> = [];

    for (const assignment of assignments) {
      const customerId = assignment.partnerCustomerId;
      if (!customerId) {
        continue;
      }

      const customer = customerMap.get(customerId);
      if (!customer) {
        continue;
      }

      customer.unbilledAmount += assignment.shipment.charges.reduce((sum, charge) => sum + charge.totalAmount, 0);
      customer.unbilledChargeCount += assignment.shipment.charges.length;

      for (const invoice of assignment.shipment.invoices) {
        const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
        const rawDaysOverdue = dueDate
          ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        const daysOverdue = rawDaysOverdue !== null ? Math.max(0, rawDaysOverdue) : null;
        const isOutstanding = outstandingInvoiceStatuses.has(invoice.status);
        const isOverdue = isOutstanding && (rawDaysOverdue ?? -1) >= 0;

        customer.invoiceCount += 1;
        if (isOutstanding) {
          customer.openInvoiceCount += 1;
          customer.outstandingAmount += invoice.total;
        }
        if (isOverdue) {
          customer.overdueInvoiceCount += 1;
          customer.overdueAmount += invoice.total;
        }
        if (invoice.status === 'PAID') {
          customer.paidAmount += invoice.total;
        }

        if (!customer.lastInvoiceDate || new Date(invoice.issueDate) > new Date(customer.lastInvoiceDate)) {
          customer.lastInvoiceDate = invoice.issueDate.toISOString();
        }

        invoiceRows.push({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          total: invoice.total,
          issueDate: invoice.issueDate.toISOString(),
          dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
          paidDate: invoice.paidDate ? invoice.paidDate.toISOString() : null,
          daysOverdue,
          customerId,
          customerName: customer.name,
          shipmentId: assignment.shipment.id,
          shipmentReference: formatShipmentReference(assignment.shipment),
          paymentMethod: invoice.paymentMethod || null,
          paymentReference: invoice.paymentReference || null,
        });
      }
    }

    invoiceRows.sort((left, right) => right.issueDate.localeCompare(left.issueDate));

    for (const entry of portalLedgerEntries) {
      const customer = customerMap.get(entry.partnerCustomerId);
      if (!customer) {
        continue;
      }

      customer.portalLedgerEntryCount += 1;
      if (entry.type === 'DEBIT') {
        customer.portalDebitAmount += entry.amount;
      } else {
        customer.portalCreditAmount += entry.amount;
      }
      customer.portalBalance = customer.portalDebitAmount - customer.portalCreditAmount;
    }

    for (const paymentRecord of portalPaymentRecords) {
      const customer = customerMap.get(paymentRecord.partnerCustomerId);
      if (!customer) {
        continue;
      }

      customer.portalPaymentRecordCount += 1;
    }

    const aging = createAgingBuckets();
    const summary = invoiceRows.reduce((accumulator, invoice) => {
      accumulator.invoiceCount += 1;
      if (outstandingInvoiceStatuses.has(invoice.status)) {
        accumulator.outstandingAmount += invoice.total;
        accumulator.openInvoiceCount += 1;

        if ((invoice.daysOverdue ?? 0) <= 0) {
          aging.current.count += 1;
          aging.current.amount += invoice.total;
        } else if ((invoice.daysOverdue ?? 0) <= 30) {
          aging.days1to30.count += 1;
          aging.days1to30.amount += invoice.total;
        } else if ((invoice.daysOverdue ?? 0) <= 60) {
          aging.days31to60.count += 1;
          aging.days31to60.amount += invoice.total;
        } else if ((invoice.daysOverdue ?? 0) <= 90) {
          aging.days61to90.count += 1;
          aging.days61to90.amount += invoice.total;
        } else {
          aging.days90plus.count += 1;
          aging.days90plus.amount += invoice.total;
        }
      }
      if (invoice.status === 'PAID') {
        accumulator.paidAmount += invoice.total;
      }
      if (outstandingInvoiceStatuses.has(invoice.status) && (invoice.daysOverdue ?? 0) > 0) {
        accumulator.overdueAmount += invoice.total;
        accumulator.overdueInvoiceCount += 1;
      }
      return accumulator;
    }, {
      linkedCustomerCount: customers.filter((customer) => (customer._count?.shipmentAssignments || 0) > 0).length,
      linkedShipmentCount: assignments.length,
      invoiceCount: 0,
      openInvoiceCount: 0,
      overdueInvoiceCount: 0,
      outstandingAmount: 0,
      overdueAmount: 0,
      paidAmount: 0,
      portalBalance: 0,
      portalDebitAmount: 0,
      portalCreditAmount: 0,
      portalPaymentRecordCount: 0,
      portalLedgerEntryCount: 0,
    });

    for (const customer of customerMap.values()) {
      summary.portalBalance += customer.portalBalance;
      summary.portalDebitAmount += customer.portalDebitAmount;
      summary.portalCreditAmount += customer.portalCreditAmount;
      summary.portalPaymentRecordCount += customer.portalPaymentRecordCount;
      summary.portalLedgerEntryCount += customer.portalLedgerEntryCount;
    }

    const customerRows = Array.from(customerMap.values());

    if (format === 'csv') {
      const csvRows = [
        [
          'Customer',
          'Email',
          'Phone',
          'City',
          'Country',
          'Linked Shipments',
          'Invoice Count',
          'Open Invoices',
          'Overdue Invoices',
          'Outstanding Amount',
          'Overdue Amount',
          'Paid Amount',
          'Unbilled Amount',
          'Portal-Only Balance',
          'Portal-Only Debits',
          'Portal-Only Credits',
          'Portal-Only Payment Records',
          'Portal-Only Ledger Entries',
          'Last Invoice Date',
        ].join(','),
        ...customerRows.map((customer) => [
          csvEscape(customer.name),
          csvEscape(customer.email),
          csvEscape(customer.phone),
          csvEscape(customer.city),
          csvEscape(customer.country),
          customer.linkedShipmentCount,
          customer.invoiceCount,
          customer.openInvoiceCount,
          customer.overdueInvoiceCount,
          customer.outstandingAmount.toFixed(2),
          customer.overdueAmount.toFixed(2),
          customer.paidAmount.toFixed(2),
          (customer.unbilledAmount || 0).toFixed(2),
          (customer.portalBalance || 0).toFixed(2),
          (customer.portalDebitAmount || 0).toFixed(2),
          (customer.portalCreditAmount || 0).toFixed(2),
          customer.portalPaymentRecordCount || 0,
          customer.portalLedgerEntryCount || 0,
          csvEscape(customer.lastInvoiceDate ? customer.lastInvoiceDate.slice(0, 10) : null),
        ].join(',')),
      ];

      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="partner-portal-finance-${portal.id}-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      portal,
      summary,
      aging,
      customers: customerRows,
      invoices: invoiceRows,
    });
  } catch (error) {
    routeDeps.logger.error('Failed to fetch partner portal finance view', error);
    return NextResponse.json({ error: 'Failed to fetch partner portal finance view' }, { status: 500 });
  }
}