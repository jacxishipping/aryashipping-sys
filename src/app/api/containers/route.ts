import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { companySupportsRole } from '@/lib/company-roles';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { hasPermission } from '@/lib/rbac';
import { z } from 'zod';

// Schema for creating a container
const createContainerSchema = z.object({
  containerNumber: z.string().min(1),
  companyId: z.string().min(1),
  trackingNumber: z.string().optional(),
  vesselName: z.string().optional(),
  voyageNumber: z.string().optional(),
  shippingLine: z.string().optional(),
  bookingNumber: z.string().optional(),
  loadingPort: z.string().optional(),
  destinationPort: z.string().optional(),
  transshipmentPorts: z.array(z.string()).optional(),
  loadingDate: z.string().optional(),
  departureDate: z.string().optional(),
  estimatedArrival: z.string().optional(),
  maxCapacity: z.number().int().positive().optional(),
  notes: z.string().optional(),
  autoTrackingEnabled: z.boolean().optional(),
});

// GET - Fetch containers with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const shippingLine = searchParams.get('shippingLine');
    const destinationPort = searchParams.get('destinationPort');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build where clause
    const where: any = {};

    const canReadAllContainers = hasPermission(session.user?.role, 'containers:read_all');

    if (!canReadAllContainers) {
      where.shipments = {
        some: {
          userId: session.user.id
        }
      };
    }

    if (status) {
      // Handle special "active" status to get containers that can accept shipments
      if (status === 'active') {
        where.status = {
          in: ['CREATED', 'WAITING_FOR_LOADING', 'LOADED', 'IN_TRANSIT'],
        };
      } else {
        where.status = status;
      }
    }

    if (shippingLine) {
      where.shippingLine = { contains: shippingLine, mode: 'insensitive' };
    }

    if (destinationPort) {
      where.destinationPort = { contains: destinationPort, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { containerNumber: { contains: search, mode: 'insensitive' } },
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { vesselName: { contains: search, mode: 'insensitive' } },
        { bookingNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Execute count and fetch in parallel for performance
    const [totalCount, containers] = await Promise.all([
      prisma.container.count({ where }),
      prisma.container.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          shipments: {
            select: {
              id: true,
              vehicleVIN: true,
              vehicleMake: true,
              vehicleModel: true,
              status: true,
            },
          },
          _count: {
            select: {
              shipments: true,
              expenses: true,
              invoices: true,
              documents: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // If filtering for active containers, only return those with available space
    let filteredContainers = containers;
    if (status === 'active') {
      filteredContainers = containers.filter(c => c.currentCount < c.maxCapacity);
    }

    return NextResponse.json({
      containers: filteredContainers,
      pagination: {
        page,
        limit,
        totalCount: status === 'active' ? filteredContainers.length : totalCount,
        totalPages: Math.ceil((status === 'active' ? filteredContainers.length : totalCount) / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching containers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch containers' },
      { status: 500 }
    );
  }
}

// Schema for tracking event (used when creating containers with fetched tracking data)
const trackingEventSchema = z.object({
  status: z.string(),
  location: z.string().optional(),
  vesselName: z.string().optional(),
  description: z.string().optional(),
  eventDate: z.string(),
  completed: z.boolean(),
  source: z.string().optional(),
});

// Extended schema for creating a container with tracking events
const createContainerWithTrackingSchema = createContainerSchema.extend({
  trackingEvents: z.array(trackingEventSchema).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  currentLocation: z.string().optional(),
});

// POST - Create a new container
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'containers:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createContainerWithTrackingSchema.parse(body);

    // Check for duplicate container number
    const existing = await prisma.container.findUnique({
      where: { containerNumber: validatedData.containerNumber },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Container number already exists' },
        { status: 400 }
      );
    }

    const company = await prisma.company.findUnique({
      where: { id: validatedData.companyId },
      select: { id: true, isActive: true, companyType: true, isShipping: true },
    });

    if (!company || !company.isActive || !companySupportsRole(company, 'SHIPPING')) {
      return NextResponse.json(
        { error: 'Valid active shipping company is required for container assignment' },
        { status: 400 }
      );
    }

    // Parse dates
    const loadingDate = validatedData.loadingDate ? new Date(validatedData.loadingDate) : null;
    const departureDate = validatedData.departureDate ? new Date(validatedData.departureDate) : null;
    const estimatedArrival = validatedData.estimatedArrival ? new Date(validatedData.estimatedArrival) : null;

    // Create container
    const container = await prisma.container.create({
      data: {
        containerNumber: validatedData.containerNumber,
        companyId: validatedData.companyId,
        trackingNumber: validatedData.trackingNumber,
        vesselName: validatedData.vesselName,
        voyageNumber: validatedData.voyageNumber,
        shippingLine: validatedData.shippingLine,
        bookingNumber: validatedData.bookingNumber,
        loadingPort: validatedData.loadingPort,
        destinationPort: validatedData.destinationPort,
        transshipmentPorts: validatedData.transshipmentPorts || [],
        loadingDate,
        departureDate,
        estimatedArrival,
        maxCapacity: validatedData.maxCapacity || 4,
        notes: validatedData.notes,
        autoTrackingEnabled: validatedData.autoTrackingEnabled ?? true,
        status: 'CREATED',
        progress: validatedData.progress || 0,
        currentLocation: validatedData.currentLocation,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        shipments: true,
        trackingEvents: true,
        _count: {
          select: {
            shipments: true,
            expenses: true,
            invoices: true,
            documents: true,
          },
        },
      },
    });

    // Create tracking events if provided
    if (validatedData.trackingEvents && validatedData.trackingEvents.length > 0) {
      await prisma.containerTrackingEvent.createMany({
        data: validatedData.trackingEvents.map(event => ({
          containerId: container.id,
          status: event.status,
          location: event.location,
          vesselName: event.vesselName,
          description: event.description,
          eventDate: new Date(event.eventDate),
          completed: event.completed,
          source: event.source || 'API',
        })),
      });
      
      logger.info(`Created ${validatedData.trackingEvents.length} tracking events for container ${container.id}`);
    }

    // Create audit log
    await prisma.containerAuditLog.create({
      data: {
        containerId: container.id,
        action: 'CONTAINER_CREATED',
        description: `Container ${container.containerNumber} created${validatedData.trackingEvents?.length ? ` with ${validatedData.trackingEvents.length} tracking events` : ''}`,
        performedBy: session.user.id as string,
        newValue: container.status,
      },
    });

    return NextResponse.json({
      container,
      message: 'Container created successfully',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    logger.error('Error creating container:', error);
    return NextResponse.json(
      { error: 'Failed to create container' },
      { status: 500 }
    );
  }
}
