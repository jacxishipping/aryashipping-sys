import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { VehicleInspectionData } from '@/types/vehicle-inspection';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      select: {
        id: true,
        vehicleVIN: true,
        vehicleYear: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleColor: true,
        lotNumber: true,
        auctionName: true,
        hasKey: true,
        hasTitle: true,
        damageCost: true,
        userId: true,
      },
    });

    if (!shipment) {
      return NextResponse.json({ message: 'Shipment not found' }, { status: 404 });
    }

    // Find latest damage assessment quality check
    const qualityCheck = await prisma.qualityCheck.findFirst({
      where: {
        shipmentId: id,
        checkType: 'DAMAGE_ASSESSMENT',
      },
      orderBy: { createdAt: 'desc' },
    });

    let inspection: VehicleInspectionData | null = null;

    if (qualityCheck && qualityCheck.notes) {
      try {
        const parsed = JSON.parse(qualityCheck.notes);
        inspection = {
          ...parsed,
          id: qualityCheck.id,
          inspectedAt: qualityCheck.checkedAt?.toISOString() || qualityCheck.createdAt.toISOString(),
          inspectorName: qualityCheck.inspector || parsed.inspectorName || 'Yard Inspector',
        };
      } catch (e) {
        console.warn('Failed to parse inspection JSON in notes:', e);
      }
    }

    return NextResponse.json({ inspection, shipment }, { status: 200 });
  } catch (error) {
    console.error('Error fetching vehicle inspection:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Role verification
    const canManage =
      session.user?.role === 'admin' ||
      hasPermission(session.user?.role, 'shipments:manage') ||
      hasPermission(session.user?.role, 'workflow:move');

    if (!canManage) {
      return NextResponse.json(
        { message: 'Forbidden: Insufficient permissions to perform vehicle inspection' },
        { status: 403 }
      );
    }

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      select: {
        id: true,
        vehicleVIN: true,
        vehicleYear: true,
        vehicleMake: true,
        vehicleModel: true,
        hasKey: true,
      },
    });

    if (!shipment) {
      return NextResponse.json({ message: 'Shipment not found' }, { status: 404 });
    }

    const payload = (await request.json()) as VehicleInspectionData;

    // Collect all photo URLs from markers + general
    const allPhotos: string[] = [];
    if (Array.isArray(payload.markers)) {
      payload.markers.forEach((m) => {
        if (Array.isArray(m.photos)) {
          m.photos.forEach((p) => {
            if (p && !allPhotos.includes(p)) allPhotos.push(p);
          });
        }
      });
    }

    const totalEstCost = Array.isArray(payload.markers)
      ? payload.markers.reduce((sum, m) => sum + (m.estimatedCost || 0), 0)
      : 0;

    const hasMajorOrCritical =
      Array.isArray(payload.markers) &&
      payload.markers.some((m) => m.severity === 'CRITICAL' || m.severity === 'HIGH');

    const cleanVin = (shipment.vehicleVIN || 'VEH').slice(-6);
    const reportNumber =
      payload.reportNumber || `JACXI-CR-${cleanVin}-${Math.floor(1000 + Math.random() * 9000)}`;

    const inspectionRecordData: VehicleInspectionData = {
      ...payload,
      reportNumber,
      inspectedAt: payload.inspectedAt || new Date().toISOString(),
      inspectorName: payload.inspectorName || session.user?.name || 'Yard Inspector',
    };

    // Upsert or create QualityCheck
    const existingCheck = await prisma.qualityCheck.findFirst({
      where: {
        shipmentId: id,
        checkType: 'DAMAGE_ASSESSMENT',
      },
      orderBy: { createdAt: 'desc' },
    });

    let savedQualityCheck;

    if (existingCheck) {
      savedQualityCheck = await prisma.qualityCheck.update({
        where: { id: existingCheck.id },
        data: {
          status: hasMajorOrCritical ? 'REQUIRES_ATTENTION' : 'PASSED',
          inspector: inspectionRecordData.inspectorName,
          notes: JSON.stringify(inspectionRecordData),
          photos: allPhotos.slice(0, 20),
          checkedAt: new Date(inspectionRecordData.inspectedAt),
        },
      });
    } else {
      savedQualityCheck = await prisma.qualityCheck.create({
        data: {
          shipmentId: id,
          checkType: 'DAMAGE_ASSESSMENT',
          status: hasMajorOrCritical ? 'REQUIRES_ATTENTION' : 'PASSED',
          inspector: inspectionRecordData.inspectorName,
          notes: JSON.stringify(inspectionRecordData),
          photos: allPhotos.slice(0, 20),
          checkedAt: new Date(inspectionRecordData.inspectedAt),
        },
      });
    }

    // Update shipment custody flags
    await prisma.shipment.update({
      where: { id },
      data: {
        hasKey: payload.hasPhysicalKey,
        damageCost: totalEstCost > 0 ? totalEstCost : undefined,
      },
    });

    // Record document for condition report receipt
    try {
      const existingDoc = await prisma.document.findFirst({
        where: {
          shipmentId: id,
          category: 'INSPECTION_REPORT',
        },
      });

      if (existingDoc) {
        await prisma.document.update({
          where: { id: existingDoc.id },
          data: {
            name: `Condition Report - ${reportNumber}`,
            description: `Yard intake condition report (${payload.overallGrade}, ${payload.markers.length} damage pins)`,
            fileUrl: `/dashboard/shipments/${id}?tab=damages`,
            uploadedBy: inspectionRecordData.inspectorName,
            isPublic: true,
          },
        });
      } else {
        await prisma.document.create({
          data: {
            name: `Condition Report - ${reportNumber}`,
            description: `Yard intake condition report (${payload.overallGrade}, ${payload.markers.length} damage pins)`,
            fileUrl: `/dashboard/shipments/${id}?tab=damages`,
            fileType: 'application/pdf',
            fileSize: 2048,
            category: 'INSPECTION_REPORT',
            shipmentId: id,
            uploadedBy: inspectionRecordData.inspectorName,
            isPublic: true,
            tags: ['CONDITION_REPORT', 'DAMAGE_INSPECTION', 'EXPORT_INSURANCE'],
          },
        });
      }
    } catch (docErr) {
      console.warn('Failed to record Document entry for condition report:', docErr);
    }

    // Record Audit Log
    try {
      await prisma.shipmentAuditLog.create({
        data: {
          shipmentId: id,
          action: 'DAMAGE_INSPECTION_LOGGED',
          description: `Yard condition inspection completed: ${payload.markers.length} damage hotspots tagged (${payload.overallGrade}) by ${inspectionRecordData.inspectorName}`,
          performedBy: session.user?.name || session.user?.email || 'Yard Inspector',
        },
      });
    } catch (auditErr) {
      console.warn('Failed to record shipment audit log for inspection:', auditErr);
    }

    return NextResponse.json(
      {
        message: 'Inspection recorded successfully',
        inspection: {
          ...inspectionRecordData,
          id: savedQualityCheck.id,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving vehicle inspection:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
