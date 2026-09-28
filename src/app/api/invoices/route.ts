import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';

/**
 * GET /api/invoices
 * Get all invoices (admin) or user's invoices (regular user)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const containerId = searchParams.get('containerId');
    const shipmentId = searchParams.get('shipmentId');
    const search = (searchParams.get('search') || '').trim();
    
    // Parse pagination parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 1000); // Max 1000
    const offset = parseInt(searchParams.get('offset') || '0');

    // Check if user is admin
    const canReadAllInvoices = hasPermission(session.user?.role, 'invoices:manage');

    // Build base where clause used for the overall invoice count.
    const baseWhere: any = {
      AND: [
        {
          OR: [
            { shipmentId: { not: null } },
            { containerId: { not: null } },
          ],
        },
      ],
    };

    if (!canReadAllInvoices) {
      baseWhere.AND.push({ userId: session.user.id });
    } else if (userId) {
      baseWhere.AND.push({ userId });
    }

    // Build where clause
    const where: any = {
      AND: [...baseWhere.AND],
    };

    if (status) {
      where.AND.push({ status });
    }

    if (containerId) {
      where.AND.push({ containerId });
    }

    if (shipmentId) {
      where.AND.push({ shipmentId });
    }

    if (search) {
      where.AND.push({
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { container: { containerNumber: { contains: search, mode: 'insensitive' } } },
          { shipment: { vehicleVIN: { contains: search, mode: 'insensitive' } } },
          { shipment: { vehicleMake: { contains: search, mode: 'insensitive' } } },
          { shipment: { vehicleModel: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    // Get invoices
    const [invoices, total, totalAll] = await Promise.all([
      prisma.userInvoice.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          container: {
            select: {
              id: true,
              containerNumber: true,
              status: true,
            },
          },
          shipment: {
            select: {
              id: true,
              vehicleYear: true,
              vehicleMake: true,
              vehicleModel: true,
              vehicleVIN: true,
              vehicleColor: true,
              vehicleType: true,
            },
          },
          lineItems: {
            include: {
              shipment: {
                select: {
                  id: true,
                  vehicleMake: true,
                  vehicleModel: true,
                  vehicleYear: true,
                  vehicleVIN: true,
                },
              },
            },
          },
          _count: {
            select: {
              lineItems: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.userInvoice.count({ where }),
      prisma.userInvoice.count({ where: baseWhere }),
    ]);

    // For cancelled (reversed) invoices, surface who reversed them and when from
    // the invoice audit log so the list can be used as a reversal log.
    const cancelledInvoiceIds = invoices
      .filter((invoice) => invoice.status === 'CANCELLED')
      .map((invoice) => invoice.id);
    const reversalMap = new Map<string, { reversedAt: Date; reversedBy: { id: string; name: string | null; email: string } }>();
    if (cancelledInvoiceIds.length > 0) {
      const cancellationLogs = await prisma.invoiceAuditLog.findMany({
        where: {
          invoiceId: { in: cancelledInvoiceIds },
          action: 'STATUS_CHANGE',
          newValue: 'CANCELLED',
        },
        orderBy: { timestamp: 'desc' },
      });
      const actorIds = Array.from(new Set(cancellationLogs.map((log) => log.performedBy)));
      const actors = actorIds.length
        ? await prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, name: true, email: true },
          })
        : [];
      const actorMap = new Map(actors.map((actor) => [actor.id, actor]));
      for (const log of cancellationLogs) {
        if (reversalMap.has(log.invoiceId)) continue;
        const actor = actorMap.get(log.performedBy);
        reversalMap.set(log.invoiceId, {
          reversedAt: log.timestamp,
          reversedBy: actor
            ? { id: actor.id, name: actor.name, email: actor.email }
            : { id: log.performedBy, name: null, email: log.performedBy },
        });
      }
    }

    const invoicesWithReversalInfo = invoices.map((invoice) => {
      if (invoice.status !== 'CANCELLED') return invoice;
      const reversal = reversalMap.get(invoice.id);
      return reversal ? { ...invoice, reversedAt: reversal.reversedAt, reversedBy: reversal.reversedBy } : invoice;
    });

    return NextResponse.json({
      invoices: invoicesWithReversalInfo,
      pagination: {
        total,
        totalAll,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
