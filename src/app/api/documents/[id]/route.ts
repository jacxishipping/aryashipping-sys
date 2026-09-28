import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

// Temporary type until migration
type TempDocumentCategory = 'INVOICE' | 'BILL_OF_LADING' | 'CUSTOMS' | 'INSURANCE' | 'TITLE' | 'INSPECTION_REPORT' | 'PHOTO' | 'CONTRACT' | 'OTHER';

// GET: Get single document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        shipment: {
          select: {
            id: true,
            vehicleType: true,
            vehicleMake: true,
            vehicleModel: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { message: 'Document not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (session.user?.role !== 'admin' && 
        !document.isPublic && 
        document.userId !== session.user?.id) {
      return NextResponse.json(
        { message: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Update document
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    const existingDocument = await prisma.document.findUnique({
      where: { id },
    });

    if (!existingDocument) {
      return NextResponse.json(
        { message: 'Document not found' },
        { status: 404 }
      );
    }

    // Only internal users with document management permission can update.
    if (!hasPermission(session.user?.role, 'documents:manage')) {
      return NextResponse.json(
        { message: 'Forbidden' },
        { status: 403 }
      );
    }

    const { name, description, category, isPublic, tags } = data;
    
    type UpdateDataType = {
      name?: string;
      description?: string | null;
      category?: TempDocumentCategory;
      isPublic?: boolean;
      tags?: string[];
    };
    const updateData: UpdateDataType = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category) updateData.category = category as TempDocumentCategory;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (tags) updateData.tags = tags;

    const document = await prisma.document.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      message: 'Document updated successfully',
      document,
    });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existingDocument = await prisma.document.findUnique({
      where: { id },
    });

    if (!existingDocument) {
      return NextResponse.json(
        { message: 'Document not found' },
        { status: 404 }
      );
    }

    // Only internal users with document management permission can delete.
    if (!hasPermission(session.user?.role, 'documents:manage')) {
      return NextResponse.json(
        { message: 'Forbidden' },
        { status: 403 }
      );
    }

    await prisma.document.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

