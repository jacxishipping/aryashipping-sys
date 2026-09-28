import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

const outstandingInvoiceStatuses = new Set(['PENDING', 'SENT', 'OVERDUE']);
const collectionStatuses = new Set(['CURRENT', 'FOLLOW_UP', 'PROMISED_TO_PAY', 'IN_COLLECTIONS', 'ESCALATED', 'ON_HOLD']);

function getInvoiceKind(invoiceNumber: string) {
  if (invoiceNumber.startsWith('CRN-')) {
    return 'CREDIT_NOTE';
  }

  if (invoiceNumber.startsWith('SUP-')) {
    return 'SUPPLEMENTAL';
  }

  return 'INVOICE';
}

function buildShipmentReference(shipment: {
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleVIN: string | null;
} | null) {
  if (!shipment) {
    return null;
  }

  const label = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (shipment.vehicleVIN && label) {
    return `${label} (${shipment.vehicleVIN})`;
  }

  return shipment.vehicleVIN || label || null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = id;

    if (!userId) {
      return NextResponse.json({ message: 'User ID required' }, { status: 400 });
    }

    const canManageUsers = hasPermission(session.user?.role, 'users:manage') || hasPermission(session.user?.role, 'customers:view');
    if (!canManageUsers && session.user?.id !== userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        city: true,
        country: true,
        collectionStatus: true,
        promiseToPayDate: true,
        collectionFollowUpDate: true,
        collectionNotes: true,
        loginCode: true,
        createdAt: true,
        updatedAt: true,
        shipments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            vehicleType: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleYear: true,
            vehicleVIN: true,
            status: true,
            createdAt: true,
            containerId: true,
            price: true,
            vehiclePhotos: true,
            container: {
              select: {
                containerNumber: true,
                status: true,
                currentLocation: true,
                estimatedArrival: true,
                vesselName: true,
                shippingLine: true,
                progress: true
              }
            }
          }
        }
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    let statement = null;

    if (user.role === 'user') {
      const [latestLedgerEntry, invoices] = await Promise.all([
        prisma.ledgerEntry.findFirst({
          where: { userId },
          orderBy: { transactionDate: 'desc' },
          select: { balance: true },
        }),
        prisma.userInvoice.findMany({
          where: {
            userId,
            status: {
              not: 'CANCELLED',
            },
          },
          orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
          take: 50,
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
            shipment: {
              select: {
                vehicleYear: true,
                vehicleMake: true,
                vehicleModel: true,
                vehicleVIN: true,
              },
            },
            container: {
              select: {
                containerNumber: true,
              },
            },
          },
        }),
      ]);

      const today = new Date();
      const aging = {
        current: { count: 0, amount: 0 },
        days1to30: { count: 0, amount: 0 },
        days31to60: { count: 0, amount: 0 },
        days61to90: { count: 0, amount: 0 },
        days90plus: { count: 0, amount: 0 },
      };

      const timeline = invoices.map((invoice) => {
        const kind = getInvoiceKind(invoice.invoiceNumber);
        const isOutstanding = outstandingInvoiceStatuses.has(invoice.status);
        const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
        const rawDaysOverdue = dueDate
          ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        const daysOverdue = rawDaysOverdue !== null ? Math.max(0, rawDaysOverdue) : null;
        const reference = buildShipmentReference(invoice.shipment) || (invoice.container?.containerNumber ? `Container ${invoice.container.containerNumber}` : null);

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
          kind,
          status: invoice.status,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          paidDate: invoice.paidDate,
          total: invoice.total,
          reference,
          daysOverdue,
          paymentMethod: invoice.paymentMethod,
          paymentReference: invoice.paymentReference,
        };
      });

      const outstandingAmount = timeline
        .filter((invoice) => outstandingInvoiceStatuses.has(invoice.status))
        .reduce((sum, invoice) => sum + invoice.total, 0);
      const overdueAmount = timeline
        .filter((invoice) => outstandingInvoiceStatuses.has(invoice.status) && (invoice.daysOverdue ?? 0) > 0)
        .reduce((sum, invoice) => sum + invoice.total, 0);
      const paidAmount = timeline
        .filter((invoice) => invoice.status === 'PAID')
        .reduce((sum, invoice) => sum + invoice.total, 0);
      const creditAmount = timeline
        .filter((invoice) => invoice.kind === 'CREDIT_NOTE')
        .reduce((sum, invoice) => sum + Math.abs(invoice.total), 0);
      const latestBalance = latestLedgerEntry?.balance ?? 0;

      statement = {
        summary: {
          outstandingAmount,
          overdueAmount,
          paidAmount,
          creditAmount,
          openInvoiceCount: timeline.filter((invoice) => outstandingInvoiceStatuses.has(invoice.status)).length,
          overdueInvoiceCount: timeline.filter((invoice) => outstandingInvoiceStatuses.has(invoice.status) && (invoice.daysOverdue ?? 0) > 0).length,
          paidInvoiceCount: timeline.filter((invoice) => invoice.status === 'PAID').length,
          availableCredit: latestBalance < 0 ? Math.abs(latestBalance) : 0,
          accountBalance: latestBalance,
        },
        collections: {
          status: user.collectionStatus,
          promiseToPayDate: user.promiseToPayDate,
          followUpDate: user.collectionFollowUpDate,
          notes: user.collectionNotes,
        },
        aging,
        timeline,
        generatedAt: today.toISOString(),
      };
    }

    return NextResponse.json({ user: { ...user, statement } });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = id;

    if (!userId) {
      return NextResponse.json({ message: 'User ID required' }, { status: 400 });
    }

    const canManageUsers = hasPermission(session.user?.role, 'users:manage') || hasPermission(session.user?.role, 'customers:manage');
    if (!canManageUsers && session.user?.id !== userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, role, phone, address, city, country, collectionStatus, promiseToPayDate, followUpDate, collectionNotes, password } = body;

    // Validate email if changed (check uniqueness)
    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json({ message: 'Email already in use' }, { status: 400 });
      }
    }

    if (role && !hasPermission(session.user?.role, 'users:manage')) {
      return NextResponse.json({ message: 'Forbidden: Cannot change role' }, { status: 403 });
    }

    let passwordHash: string | undefined;
    if (password !== undefined && password !== null && typeof password === 'string' && password.trim() !== '') {
      const canManagePasswords =
        session.user?.role === 'admin' ||
        hasPermission(session.user?.role, 'users:manage') ||
        hasPermission(session.user?.role, 'customers:manage');

      if (!canManagePasswords) {
        return NextResponse.json({ message: 'Forbidden: Cannot change user password' }, { status: 403 });
      }

      const trimmedPassword = password.trim();
      if (trimmedPassword.length < 6) {
        return NextResponse.json({ message: 'Password must be at least 6 characters long' }, { status: 400 });
      }

      passwordHash = await bcrypt.hash(trimmedPassword, 12);
    }

    const wantsCollectionUpdate =
      collectionStatus !== undefined ||
      promiseToPayDate !== undefined ||
      followUpDate !== undefined ||
      collectionNotes !== undefined;

    if (wantsCollectionUpdate && !hasPermission(session.user?.role, 'customers:manage') && !hasPermission(session.user?.role, 'finance:manage')) {
      return NextResponse.json({ message: 'Forbidden: Cannot update collections workflow' }, { status: 403 });
    }

    if (collectionStatus !== undefined && (typeof collectionStatus !== 'string' || !collectionStatuses.has(collectionStatus))) {
      return NextResponse.json({ message: 'Invalid collection status' }, { status: 400 });
    }

    const parseOptionalDate = (value: unknown) => {
      if (value === undefined) {
        return undefined;
      }

      if (value === null || value === '') {
        return null;
      }

      if (typeof value !== 'string') {
        throw new Error('Invalid date value');
      }

      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error('Invalid date value');
      }

      return parsed;
    };

    let promiseToPayDateValue: Date | null | undefined;
    let followUpDateValue: Date | null | undefined;

    try {
      promiseToPayDateValue = parseOptionalDate(promiseToPayDate);
      followUpDateValue = parseOptionalDate(followUpDate);
    } catch {
      return NextResponse.json({ message: 'Invalid collection date' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        role, // only if provided
        phone,
        address,
        city,
        country,
        ...(passwordHash ? { passwordHash } : {}),
        ...(collectionStatus !== undefined ? { collectionStatus } : {}),
        ...(promiseToPayDateValue !== undefined ? { promiseToPayDate: promiseToPayDateValue } : {}),
        ...(followUpDateValue !== undefined ? { collectionFollowUpDate: followUpDateValue } : {}),
        ...(collectionNotes !== undefined ? { collectionNotes: collectionNotes || null } : {}),
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session.user?.role, 'users:manage') && !hasPermission(session.user?.role, 'customers:manage')) {
      return NextResponse.json({ message: 'Forbidden: Only admins can delete users' }, { status: 403 });
    }
    const { id } = await params;
    const userId = id;
    if (!userId) {
      return NextResponse.json({ message: 'User ID required' }, { status: 400 });
    }
    // Prevent self-delete
    if (session.user.id === userId) {
      return NextResponse.json({ message: 'You cannot delete your own account.' }, { status: 400 });
    }
    const deleted = await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
