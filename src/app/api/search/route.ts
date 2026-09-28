import { NextRequest, NextResponse } from 'next/server';
import { Prisma, ShipmentSimpleStatus } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sanitizeTrackNumber } from '@/lib/tracking-sanitize';
import {
  buildShipmentWorkflowStageWhereInput,
  getShipmentWorkflowStage,
  isShipmentWorkflowStage,
} from '@/lib/shipment-workflow-stage';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = (searchParams.get('query') || searchParams.get('q') || '').trim();
    // Sanitize query using unified tracking-sanitize helper (handles URLs, prefixes, etc.)
    const query = rawQuery ? sanitizeTrackNumber(rawQuery) || rawQuery : '';
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status');
    const workflowStage = searchParams.get('workflowStage');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const yardReceived = searchParams.get('yardReceived');
    // 'delivered' | 'undelivered' | undefined (= all)
    const deliveryFilter = searchParams.get('delivery');
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;
    const isAdmin = session.user?.role === 'admin';

    const results: {
      shipments?: Array<Record<string, unknown>>;
      totalShipments?: number;
    } = {};

    // Search Shipments
    if (type === 'all' || type === 'shipments') {
      // Build OR conditions for search
      const orConditions: Prisma.ShipmentWhereInput[] = [];
      
      if (query) {
        orConditions.push(
          { id: { equals: query } },
          { id: { equals: query.toLowerCase() } },
          { vehicleType: { contains: query, mode: 'insensitive' } },
          { vehicleMake: { contains: query, mode: 'insensitive' } },
          { vehicleModel: { contains: query, mode: 'insensitive' } },
          { vehicleVIN: { contains: query, mode: 'insensitive' } },
          { lotNumber: { contains: query, mode: 'insensitive' } },
          { auctionName: { contains: query, mode: 'insensitive' } },
          {
            container: {
              OR: [
                { containerNumber: { contains: query, mode: 'insensitive' } },
                { trackingNumber: { contains: query, mode: 'insensitive' } },
                ...(isAdmin
                  ? ([
                      { loadingPort: { contains: query, mode: 'insensitive' as const } },
                      { destinationPort: { contains: query, mode: 'insensitive' as const } },
                    ] satisfies Prisma.ContainerWhereInput[])
                  : []),
              ],
            },
          },
          {
            dispatch: {
              referenceNumber: { contains: query, mode: 'insensitive' },
            },
          },
          {
            transit: {
              referenceNumber: { contains: query, mode: 'insensitive' },
            },
          }
        );
      }

      const where: Prisma.ShipmentWhereInput = {
        ...(isAdmin ? {} : { userId: session.user?.id }),
        ...(orConditions.length > 0 ? { OR: orConditions } : {}),
        ...(status ? { status: status as ShipmentSimpleStatus } : {}),
        ...(deliveryFilter === 'delivered'
          ? { status: 'DELIVERED' as ShipmentSimpleStatus }
          : deliveryFilter === 'undelivered'
            ? { status: { not: 'DELIVERED' as ShipmentSimpleStatus } }
            : {}),
        ...(workflowStage && isShipmentWorkflowStage(workflowStage)
          ? buildShipmentWorkflowStageWhereInput(workflowStage)
          : {}),
        ...(yardReceived === 'true'
          ? {
              auditLogs: {
                some: {
                  action: 'DISPATCH_COMPLETED',
                  description: {
                    contains: 'received to yard',
                    mode: 'insensitive',
                  },
                },
              },
            }
          : {}),
        ...(dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
              },
            }
          : {}),
        ...(minPrice || maxPrice
          ? {
              price: {
                ...(minPrice ? { gte: parseFloat(minPrice) } : {}),
                ...(maxPrice ? { lte: parseFloat(maxPrice) } : {}),
              },
            }
          : {}),
        ...(userId ? { userId } : {}),
      };

      const [shipments, totalShipments] = await Promise.all([
        prisma.shipment.findMany({
          where,
          select: {
            id: true,
            vehicleType: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleYear: true,
            vehicleVIN: true,
            vehicleColor: true,
            lotNumber: true,
            auctionName: true,
            hasKey: true,
            hasTitle: true,
            titleStatus: true,
            vehicleAge: true,
            weight: true,
            dimensions: true,
            insuranceValue: true,
            status: true,
            dispatchId: true,
            containerId: true,
            transitId: true,
            userId: true,
            internalNotes: true,
            price: true,
            purchasePrice: true,
            paymentStatus: true,
            paymentMode: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            container: {
              select: {
                id: true,
                containerNumber: true,
                trackingNumber: true,
                loadingPort: true,
                destinationPort: true,
                status: true,
                progress: true,
                estimatedArrival: true,
                vesselName: true,
                shippingLine: true,
                currentLocation: true,
              },
            },
            dispatch: {
              select: {
                id: true,
                referenceNumber: true,
                status: true,
                origin: true,
                destination: true,
              },
            },
            transit: {
              select: {
                id: true,
                referenceNumber: true,
                status: true,
                destination: true,
              },
            },
            auditLogs: {
              where: {
                action: 'DISPATCH_COMPLETED',
                description: {
                  contains: 'received to yard',
                  mode: 'insensitive',
                },
              },
              select: {
                timestamp: true,
              },
              orderBy: {
                timestamp: 'desc',
              },
              take: 1,
            },
            ledgerEntries: {
              select: {
                type: true,
                amount: true,
                transactionInfoType: true,
              },
            },
          },
          orderBy: {
            [sortBy]: sortOrder as 'asc' | 'desc',
          },
          skip,
          take: limit,
        }),
        prisma.shipment.count({ where }),
      ]);

      results.shipments = (shipments as Array<any>).map((shipment) => {
        let purchasePricePaid = 0;
        for (const entry of (shipment.ledgerEntries || [])) {
          if (entry.type === 'CREDIT' && entry.transactionInfoType === 'CAR_PAYMENT') {
            purchasePricePaid += entry.amount;
          }
        }
        return {
          ...shipment,
          purchasePricePaid,
          workflowStage: getShipmentWorkflowStage(shipment),
          yardReceived: shipment.auditLogs.length > 0,
          yardReceivedAt: shipment.auditLogs[0]?.timestamp ?? null,
          auditLogs: undefined,
          ledgerEntries: undefined,
        };
      });
      results.totalShipments = totalShipments;
    }

    return NextResponse.json({
      ...results,
      page,
      limit,
      query,
    });
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
