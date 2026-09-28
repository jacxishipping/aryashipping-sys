import { NextRequest, NextResponse } from 'next/server';
import { Prisma, TitleStatus, PaymentStatus, ShipmentSimpleStatus, LineItemType } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { generateInvoiceNumber } from '@/lib/shipment-invoice';
import { syncShipmentPurchasePriceEntries } from '@/lib/shipment-purchase-price';

const SUPPORTED_SHIPMENT_STATUSES = new Set<ShipmentSimpleStatus>([
  'ON_HAND',
  'DISPATCHING',
  'IN_TRANSIT',
  'RELEASED',
  'IN_TRANSIT_TO_DESTINATION',
  'DELIVERED',
]);

function isShipmentStatus(value: string): value is ShipmentSimpleStatus {
  return SUPPORTED_SHIPMENT_STATUSES.has(value as ShipmentSimpleStatus);
}

function asRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const containerId = searchParams.get('containerId');
    const userId = searchParams.get('userId');
    const search = searchParams.get('search');
    const includeFinancial = searchParams.get('includeFinancial') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build where clause based on user role
    const where: Prisma.ShipmentWhereInput = {};
    const canReadAllShipments = hasPermission(session.user?.role, 'shipments:read_all');
    
    // Regular users can only see their own shipments.
    // Privileged users can optionally scope results to a specific user via ?userId=...
    if (!canReadAllShipments) {
      where.userId = session.user?.id;
    } else if (userId) {
      where.userId = userId;
    }

    // Add status filter
    if (status && isShipmentStatus(status)) {
      where.status = status;
    }

    // Filter by container
    if (containerId) {
      where.containerId = containerId;
    }

    // Filter unassigned shipments (no container)
    const unassigned = searchParams.get('unassigned');
    if (unassigned === 'true') {
      where.containerId = null;
    }

    // Search by VIN, make, model
    if (search) {
      where.OR = [
        { vehicleVIN: { contains: search, mode: 'insensitive' } },
        { vehicleMake: { contains: search, mode: 'insensitive' } },
        { vehicleModel: { contains: search, mode: 'insensitive' } },
        { lotNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const baseSelect = {
      id: true,
      vehicleType: true,
      vehicleMake: true,
      vehicleModel: true,
      vehicleYear: true,
      vehicleVIN: true,
      vehicleColor: true,
      lotNumber: true,
      auctionName: true,
      status: true,
      createdAt: true,
      paymentStatus: true,
      price: true,
      serviceType: true,
      purchasePrice: true,
      dispatchId: true,
      containerId: true,
      transitId: true,
      internalNotes: true,
      dispatch: {
        select: {
          id: true,
          referenceNumber: true,
          status: true,
          origin: true,
          destination: true,
        },
      },
      container: {
        select: {
          id: true,
          containerNumber: true,
          trackingNumber: true,
          vesselName: true,
          status: true,
          estimatedArrival: true,
          currentLocation: true,
          loadingPort: true,
          destinationPort: true,
          progress: true,
          shippingLine: true,
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
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    };

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        select: includeFinancial
          ? {
              ...baseSelect,
              ledgerEntries: {
                select: {
                  type: true,
                  amount: true,
                  transactionInfoType: true,
                  metadata: true,
                },
              },
            }
          : baseSelect,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.shipment.count({ where }),
    ]);

    const normalizedShipments = includeFinancial
      ? (shipments as Array<any>).map((shipment) => {
          let totalDebit = 0;
          let totalCredit = 0;
          let purchaseDebit = 0;
          let purchaseCredit = 0;
          let expenseDebit = 0;
          let expenseCredit = 0;

          for (const entry of shipment.ledgerEntries) {
            const metadata = asRecord(entry.metadata);
            const isPurchaseEntry = metadata.isShipmentPurchasePrice === true || entry.transactionInfoType === 'CAR_PAYMENT';
            const isExpenseEntry =
              metadata.isExpense === true ||
              metadata.pendingInvoice === true ||
              typeof metadata.expenseType === 'string';
            const paymentCategory = typeof metadata.paymentCategory === 'string' ? metadata.paymentCategory : null;

            if (entry.type === 'DEBIT') {
              totalDebit += entry.amount;
              if (isPurchaseEntry) {
                purchaseDebit += entry.amount;
              } else if (isExpenseEntry) {
                expenseDebit += entry.amount;
              }
            } else if (entry.type === 'CREDIT') {
              totalCredit += entry.amount;
              if (paymentCategory === 'PURCHASE_PRICE' || entry.transactionInfoType === 'CAR_PAYMENT') {
                purchaseCredit += entry.amount;
              } else if (paymentCategory === 'EXPENSES' || entry.transactionInfoType === 'SHIPPING_PAYMENT' || entry.transactionInfoType === 'STORAGE_PAYMENT') {
                expenseCredit += entry.amount;
              }
            }
          }

          const amountDue = Math.max(0, totalDebit - totalCredit);
          const purchaseAmountDue = Math.max(0, purchaseDebit - purchaseCredit);
          const expenseAmountDue = Math.max(0, expenseDebit - expenseCredit);

          return {
            ...shipment,
            amountDue,
            purchaseAmountDue,
            expenseAmountDue,
            ledgerEntries: undefined,
          };
        })
      : shipments;

    return NextResponse.json({
      shipments: normalizedShipments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching shipments:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

type CreateShipmentPayload = {
  userId: string;
  serviceType?: 'PURCHASE_AND_SHIPPING' | 'SHIPPING_ONLY';
  vehicleType: string;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleYear?: number | string | null;
  vehicleVIN?: string | null;
  vehicleColor?: string | null;
  lotNumber?: string | null;
  auctionName?: string | null;
  weight?: number | string | null;
  dimensions?: string | null;
  specialInstructions?: string | null;
  vehiclePhotos?: string[] | null;
  status?: 'ON_HAND' | 'IN_TRANSIT' | 'RELEASED' | null;
  containerId?: string | null;
  internalNotes?: string | null;
  hasKey?: boolean | null;
  hasTitle?: boolean | null;
  titleStatus?: string | null;
  paymentMode?: 'CASH' | 'DUE' | null;
  // Purchase fields (for PURCHASE_AND_SHIPPING service type)
  purchasePrice?: number | string | null;
  purchaseDate?: string | null;
  purchaseLocation?: string | null;
  dealerName?: string | null;
  purchaseNotes?: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const actorId = session?.user?.id;
    
    if (!session || !actorId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can create shipments and assign them to users
    if (!hasPermission(session.user?.role, 'shipments:manage')) {
      return NextResponse.json(
        { message: 'Forbidden: Only admins can create shipments' },
        { status: 403 }
      );
    }

    const data = (await request.json()) as CreateShipmentPayload;
    const { 
      userId, // Admin must specify which user this shipment is for
      serviceType,
      vehicleType, 
      vehicleMake, 
      vehicleModel, 
      vehicleYear,
      vehicleVIN,
      vehicleColor,
      lotNumber,
      auctionName,
      weight,
      dimensions,
      vehiclePhotos,
      status: providedStatus,
      containerId,
      internalNotes,
      hasKey,
      hasTitle,
      titleStatus,
      paymentMode,
      // Purchase fields
      purchasePrice,
      purchaseDate,
      purchaseLocation,
      dealerName,
      purchaseNotes,
    } = data;

    // Validate required fields
    if (!vehicleType || !userId) {
      return NextResponse.json(
        { message: 'Missing required fields: vehicleType and userId are required' },
        { status: 400 }
      );
    }

    // If status is IN_TRANSIT/RELEASED, containerId is required
    if ((providedStatus === 'IN_TRANSIT' || providedStatus === 'RELEASED') && !containerId) {
      return NextResponse.json(
        { message: 'Container ID is required for IN_TRANSIT or RELEASED shipments' },
        { status: 400 }
      );
    }

    // If containerId is provided, verify it exists
    if (containerId) {
      const container = await prisma.container.findUnique({
        where: { id: containerId },
        include: { shipments: true },
      });

      if (!container) {
        return NextResponse.json(
          { message: 'Container not found' },
          { status: 404 }
        );
      }

      // Check capacity
      if (container.shipments.length >= container.maxCapacity) {
        return NextResponse.json(
          { message: `Container is at full capacity (${container.maxCapacity} vehicles)` },
          { status: 400 }
        );
      }
    }

    // Verify that the userId exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Check for duplicate VIN if provided
    if (vehicleVIN && vehicleVIN.trim()) {
      const existingShipment = await prisma.shipment.findFirst({
        where: { 
          vehicleVIN: vehicleVIN.trim(),
        },
        select: {
          id: true,
          vehicleVIN: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (existingShipment) {
        return NextResponse.json(
          { 
            message: `This VIN is already assigned to another shipment (VIN: ${existingShipment.vehicleVIN}, User: ${existingShipment.user.name || existingShipment.user.email})`,
          },
          { status: 400 }
        );
      }
    }

    const normalizedStatus = containerId ? 'IN_TRANSIT' : (providedStatus || 'ON_HAND');
    const sanitizedVehiclePhotos = Array.isArray(vehiclePhotos)
      ? vehiclePhotos.filter((photo): photo is string => typeof photo === 'string')
      : [];
    const parsedVehicleYear =
      typeof vehicleYear === 'number'
        ? vehicleYear
        : typeof vehicleYear === 'string'
        ? parseInt(vehicleYear, 10)
        : null;
    const parsedWeight =
      typeof weight === 'number' ? weight : typeof weight === 'string' ? parseFloat(weight) : null;
    const parsedPurchasePrice =
      typeof purchasePrice === 'number' ? purchasePrice : typeof purchasePrice === 'string' ? parseFloat(purchasePrice) : null;
    
    // Calculate vehicle age if vehicleYear is provided
    const currentYear = new Date().getFullYear();
    const calculatedVehicleAge = parsedVehicleYear ? currentYear - parsedVehicleYear : null;
    
    // Validate titleStatus - only allowed if hasTitle is true
    const finalTitleStatus = (hasTitle === true && titleStatus) ? titleStatus as TitleStatus : null;
    
    // Validate purchase price for PURCHASE_AND_SHIPPING
    if (serviceType === 'PURCHASE_AND_SHIPPING' && !parsedPurchasePrice) {
      return NextResponse.json(
        { message: 'Purchase price is required for Purchase + Shipping service type' },
        { status: 400 }
      );
    }
    
    const shipment = await prisma.$transaction(async (tx) => {
      // Determine payment status based on payment mode
      let finalPaymentStatus = 'PENDING';
      if (paymentMode === 'CASH') {
        finalPaymentStatus = 'COMPLETED';
      } else if (paymentMode === 'DUE') {
        finalPaymentStatus = 'PENDING';
      }

      const createdShipment = await tx.shipment.create({
        data: {
          userId: userId, // Use the userId from request (assigned by admin)
          serviceType: serviceType || 'SHIPPING_ONLY',
          vehicleType,
          vehicleMake,
          vehicleModel,
          vehicleYear: parsedVehicleYear,
          vehicleVIN,
          vehicleColor,
          lotNumber,
          auctionName,
          status: normalizedStatus,
          containerId: containerId || null,
          weight: parsedWeight,
          dimensions,
          vehiclePhotos: sanitizedVehiclePhotos,
          paymentStatus: finalPaymentStatus as PaymentStatus,
          paymentMode: paymentMode || null,
          internalNotes: internalNotes || null,
          // Vehicle details
          hasKey: typeof hasKey === 'boolean' ? hasKey : null,
          hasTitle: typeof hasTitle === 'boolean' ? hasTitle : null,
          titleStatus: finalTitleStatus,
          vehicleAge: calculatedVehicleAge,
          // Purchase information
          purchasePrice: parsedPurchasePrice,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
          purchaseLocation: purchaseLocation || null,
          dealerName: dealerName || null,
          purchaseNotes: purchaseNotes || null,
        },
      });

      // Update container count if assigned
      if (containerId) {
        await tx.container.update({
          where: { id: containerId },
          data: {
            currentCount: {
              increment: 1,
            },
          },
        });
      }

      // Auto-create a per-shipment invoice
      const createInvoice = async (attempt = 0): Promise<{ id: string; [key: string]: unknown }> => {
        const invoiceNumber = await generateInvoiceNumber(tx);

        try {
          return await tx.userInvoice.create({
            data: {
              invoiceNumber,
              userId,
              shipmentId: createdShipment.id,
              status: 'PENDING',
              subtotal: parsedPurchasePrice && parsedPurchasePrice > 0 ? parsedPurchasePrice : 0,
              total: parsedPurchasePrice && parsedPurchasePrice > 0 ? parsedPurchasePrice : 0,
              amountPaid: 0,
              amountRemaining: parsedPurchasePrice && parsedPurchasePrice > 0 ? parsedPurchasePrice : 0,
              tax: 0,
              discount: 0,
            },
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002' &&
            attempt < 5
          ) {
            return createInvoice(attempt + 1);
          }

          throw error;
        }
      };

      const invoice = await createInvoice();

      if (parsedPurchasePrice && parsedPurchasePrice > 0) {
        const vehicleLabel = [parsedVehicleYear, vehicleMake, vehicleModel].filter(Boolean).join(' ') || vehicleType;
        await tx.invoiceLineItem.create({
          data: {
            invoiceId: invoice.id,
            shipmentId: createdShipment.id,
            description: `${vehicleLabel} — Vehicle Purchase Price`,
            type: LineItemType.PURCHASE_PRICE,
            quantity: 1,
            unitPrice: parsedPurchasePrice,
            amount: parsedPurchasePrice,
          },
        });
      }

      const purchasePriceSyncInput =
        serviceType === 'PURCHASE_AND_SHIPPING' &&
        parsedPurchasePrice &&
        parsedPurchasePrice > 0
          ? {
              shipmentId: createdShipment.id,
              userId,
              purchasePriceAmount: parsedPurchasePrice,
              serviceType: 'PURCHASE_AND_SHIPPING' as const,
              vehicleLabel:
                [parsedVehicleYear, vehicleMake, vehicleModel].filter(Boolean).join(' ') || vehicleType,
              vehicleVIN: vehicleVIN ?? null,
              actorUserId: actorId,
            }
          : null;

      return {
        createdShipment,
        purchasePriceSyncInput,
      };
    });

    if (shipment.purchasePriceSyncInput) {
      await syncShipmentPurchasePriceEntries(prisma, shipment.purchasePriceSyncInput);
    }

    return NextResponse.json(
      { 
        message: 'Shipment created successfully',
        shipment,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    console.error('Error creating shipment:', error);
    return NextResponse.json(
      {
        message:
          process.env.NODE_ENV === 'development'
            ? message
            : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

