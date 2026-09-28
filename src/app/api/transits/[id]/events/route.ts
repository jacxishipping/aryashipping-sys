import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { companySupportsRole } from '@/lib/company-roles';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';

const createEventSchema = z.object({
  companyId: z.string().min(1),
  origin: z.string().min(1),
  destination: z.string().min(1),
  status: z.string().min(1),
  location: z.string().optional(),
  description: z.string().optional(),
  eventDate: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'transits:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const transit = await prisma.transit.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!transit) {
      return NextResponse.json({ error: 'Transit not found' }, { status: 404 });
    }

    const events = await prisma.transitEvent.findMany({
      where: { transitId: params.id },
      include: {
        company: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching transit events:', error);
    return NextResponse.json({ error: 'Failed to fetch transit events' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'transits:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const transit = await prisma.transit.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!transit) {
      return NextResponse.json({ error: 'Transit not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createEventSchema.parse(body);

    const company = await prisma.company.findUnique({
      where: { id: validatedData.companyId },
      select: { id: true, isActive: true, companyType: true, isTransit: true },
    });

    if (!company || !company.isActive || !companySupportsRole(company, 'TRANSIT')) {
      return NextResponse.json({ error: 'Transit company not found' }, { status: 404 });
    }

    const event = await prisma.transitEvent.create({
      data: {
        transitId: params.id,
        companyId: validatedData.companyId,
        origin: validatedData.origin,
        destination: validatedData.destination,
        status: validatedData.status,
        location: validatedData.location ?? null,
        description: validatedData.description ?? null,
        eventDate: validatedData.eventDate ? new Date(validatedData.eventDate) : new Date(),
        createdBy: session.user!.id as string,
      },
      include: {
        company: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    console.error('Error creating transit event:', error);
    return NextResponse.json({ error: 'Failed to create transit event' }, { status: 500 });
  }
}
