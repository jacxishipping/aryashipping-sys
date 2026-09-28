import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { isDispatchClosed } from '@/lib/dispatch-workflow';

const eventSchema = z.object({
  status: z.string().min(1),
  location: z.string().optional(),
  description: z.string().optional(),
  eventDate: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'dispatches:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const events = await prisma.dispatchEvent.findMany({
      where: { dispatchId: params.id },
      orderBy: { eventDate: 'desc' },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching dispatch events:', error);
    return NextResponse.json({ error: 'Failed to fetch dispatch events' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'dispatches:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dispatch = await prisma.dispatch.findUnique({
      where: { id: params.id },
      select: { id: true, status: true },
    });
    if (!dispatch) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
    }

    if (isDispatchClosed(dispatch.status)) {
      return NextResponse.json(
        { error: 'Cannot add events to a completed or cancelled dispatch' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validatedData = eventSchema.parse(body);

    const event = await prisma.dispatchEvent.create({
      data: {
        dispatchId: params.id,
        status: validatedData.status,
        location: validatedData.location ?? null,
        description: validatedData.description ?? null,
        eventDate: validatedData.eventDate ? new Date(validatedData.eventDate) : new Date(),
        createdBy: session.user.id as string,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }

    console.error('Error creating dispatch event:', error);
    return NextResponse.json({ error: 'Failed to create dispatch event' }, { status: 500 });
  }
}