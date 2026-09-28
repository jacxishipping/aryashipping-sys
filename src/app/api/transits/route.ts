import { NextRequest, NextResponse } from 'next/server';
import { TransitStatus } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getDevSeededTransitSummary } from '@/lib/dev-seeded-transit';
import { hasPermission } from '@/lib/rbac';

const createTransitSchema = z.object({
  origin: z.string().min(1).default('Dubai, UAE'),
  destination: z.string().min(1).default('Kabul, Afghanistan'),
  dispatchDate: z.string().optional(),
  estimatedDelivery: z.string().optional(),
  cost: z.number().positive().optional(),
  notes: z.string().optional(),
  shipmentIds: z.array(z.string()).optional(),
});

function generateReferenceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `TRN-${year}-${random}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'transits:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const companyId = searchParams.get('companyId');
    const search = searchParams.get('search') || '';

    const where: {
      status?: TransitStatus;
      events?: { some: { companyId: string } };
      OR?: Array<{ referenceNumber?: { contains: string; mode: 'insensitive' }; notes?: { contains: string; mode: 'insensitive' } }>;
    } = {};

    if (status && Object.values(TransitStatus).includes(status as TransitStatus)) where.status = status as TransitStatus;
    if (companyId) where.events = { some: { companyId } };
    if (search) {
      where.OR = [
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const transits = await prisma.transit.findMany({
      where,
      include: {
        events: {
          orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
          take: 1,
          include: {
            company: { select: { id: true, name: true, code: true } },
          },
        },
        _count: { select: { shipments: true, events: true, expenses: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (transits.length === 0) {
      const seededTransit = getDevSeededTransitSummary({ status, companyId, search });

      if (seededTransit) {
        return NextResponse.json({ transits: [seededTransit] });
      }
    }

    return NextResponse.json({
      transits: transits.map((transit) => ({
        ...transit,
        currentEvent: transit.events[0] ?? null,
        currentCompany: transit.events[0]?.company ?? null,
      })),
    });
  } catch (error) {
    console.error('Error fetching transits:', error);
    return NextResponse.json({ error: 'Failed to fetch transits' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'transits:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createTransitSchema.parse(body);

    // Verify shipments exist if provided
    if (validatedData.shipmentIds?.length) {
      const shipments = await prisma.shipment.findMany({
        where: { id: { in: validatedData.shipmentIds } },
        select: {
          id: true,
          status: true,
          container: {
            select: {
              status: true,
            },
          },
        },
      });
      if (shipments.length !== validatedData.shipmentIds.length) {
        return NextResponse.json({ error: 'One or more shipments not found' }, { status: 404 });
      }

      const notReleased = shipments.filter(
        (shipment) => String(shipment.status) !== 'RELEASED' && shipment.container?.status !== 'RELEASED'
      );

      if (notReleased.length > 0) {
        return NextResponse.json(
          {
            error: 'Only released shipments can be assigned to transit',
            shipmentIds: notReleased.map((shipment) => shipment.id),
          },
          { status: 400 }
        );
      }
    }

    // Generate unique reference number
    let referenceNumber = generateReferenceNumber();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await prisma.transit.findUnique({ where: { referenceNumber } });
      if (!existing) break;
      referenceNumber = generateReferenceNumber();
      attempts++;
    }
    if (attempts >= 5) {
      return NextResponse.json({ error: 'Could not generate a unique reference number. Please try again.' }, { status: 500 });
    }

    const transit = await prisma.$transaction(async (tx) => {
      const created = await tx.transit.create({
        data: {
          referenceNumber,
          origin: validatedData.origin,
          destination: validatedData.destination,
          dispatchDate: validatedData.dispatchDate ? new Date(validatedData.dispatchDate) : null,
          estimatedDelivery: validatedData.estimatedDelivery ? new Date(validatedData.estimatedDelivery) : null,
          cost: validatedData.cost ?? null,
          notes: validatedData.notes ?? null,
          createdBy: session.user!.id as string,
        },
        include: {
          events: {
            orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
            take: 1,
            include: {
              company: { select: { id: true, name: true, code: true } },
            },
          },
        },
      });

      // Assign shipments if provided
      if (validatedData.shipmentIds?.length) {
        await tx.shipment.updateMany({
          where: { id: { in: validatedData.shipmentIds } },
          data: { transitId: created.id, status: 'IN_TRANSIT_TO_DESTINATION' },
        });
      }

      return created;
    });

    return NextResponse.json({
      transit: {
        ...transit,
        currentEvent: transit.events[0] ?? null,
        currentCompany: transit.events[0]?.company ?? null,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    console.error('Error creating transit:', error);
    return NextResponse.json({ error: 'Failed to create transit' }, { status: 500 });
  }
}
