import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

// Temporary type until migration
type TempDocumentCategory = 'INVOICE' | 'BILL_OF_LADING' | 'CUSTOMS' | 'INSURANCE' | 'TITLE' | 'INSPECTION_REPORT' | 'PHOTO' | 'CONTRACT' | 'OTHER';

// GET: Fetch documents
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const shipmentId = searchParams.get('shipmentId');
    const userId = searchParams.get('userId');
    const category = searchParams.get('category');
    const isPublic = searchParams.get('isPublic');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    type WhereType = {
      OR?: Array<Record<string, unknown>>;
      AND?: Array<Record<string, unknown>>;
      shipmentId?: string;
      userId?: string;
      category?: TempDocumentCategory;
      isPublic?: boolean;
    };
    const where: WhereType = {};
    
    // Non-admin users can only see their own documents or public ones
    if (session.user?.role !== 'admin') {
      where.OR = [
        { userId: session.user?.id },
        { isPublic: true },
      ];
    }

    if (shipmentId) where.shipmentId = shipmentId;
    if (userId && session.user?.role === 'admin') where.userId = userId;
    if (category) where.category = category as TempDocumentCategory;
    if (isPublic !== null) where.isPublic = isPublic === 'true';

    if (search) {
        where.AND = [
            {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                ]
            }
        ];
    }

    const [documents, total] = await Promise.all([
        prisma.document.findMany({
            where,
            include: {
                shipment: {
                    select: {
                        id: true,
                        vehicleType: true,
                    },
                },
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            skip,
            take: limit,
        }),
        prisma.document.count({ where })
    ]);

    return NextResponse.json({ 
        documents,
        pagination: {
            total,
            pages: Math.ceil(total / limit),
            currentPage: page,
            limit
        }
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Upload document
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const {
      name,
      description,
      fileUrl,
      fileType,
      fileSize,
      category,
      shipmentId,
      userId,
      isPublic,
      tags,
    } = data;

    if (!name || !fileUrl || !fileType || !category) {
      return NextResponse.json(
        { message: 'Name, file URL, file type, and category are required' },
        { status: 400 }
      );
    }

    const document = await prisma.document.create({
      data: {
        name,
        description: description || null,
        fileUrl,
        fileType,
        fileSize: fileSize || 0,
        category: category as TempDocumentCategory,
        shipmentId: shipmentId || null,
        userId: userId || session.user?.id,
        uploadedBy: session.user?.name || session.user?.email || 'Unknown',
        isPublic: isPublic || false,
        tags: tags || [],
      },
      include: {
        shipment: {
          select: {
            id: true,
          },
        },
      },
    });

    return NextResponse.json(
      { message: 'Document uploaded successfully', document },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

