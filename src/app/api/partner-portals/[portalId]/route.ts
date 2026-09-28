import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';
import { routeDeps } from '@/lib/route-deps';
import {
  canManagePartnerPortals,
  canManagePortalMemberships,
  getPartnerPortalMembership,
  getPartnerPortalOrThrow,
} from '@/lib/partner-portals';
import { isValidPortalCustomDomain, normalizePortalCustomDomain } from '@/lib/partner-portal-domains';

const updatePortalSettingsSchema = z.object({
  customDomain: z.string().trim().max(253).optional().or(z.literal('')),
  companyLabel: z.string().trim().max(120).optional().or(z.literal('')),
  accentColor: z.string().trim().regex(/^#([0-9a-fA-F]{6})$/, 'Accent color must be a 6-digit hex code').optional().or(z.literal('')),
  logoUrl: z.string().trim().url().optional().or(z.literal('')),
  notifyOnShipmentAssigned: z.boolean().optional(),
  autoAssignToSingleCustomer: z.boolean().optional(),
  defaultShipmentNotes: z.string().trim().max(1000).optional().or(z.literal('')),
  requireCustomerLinkForReady: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ portalId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await getPartnerPortalMembership(portalId, session.user.id);
    const hasInternalAccess = canManagePartnerPortals(session.user.role);

    if (!membership && !hasInternalAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Include the caller's own membership and workspace counts so the portal
    // shell can render branding, access level, and nav in a single request.
    const [portalWithMeta] = await Promise.all([
      routeDeps.prisma.partnerPortal.findUnique({
        where: { id: portalId },
        select: {
          id: true,
          name: true,
          code: true,
          customDomain: true,
          customDomainVerifiedAt: true,
          companyLabel: true,
          accentColor: true,
          logoUrl: true,
          notifyOnShipmentAssigned: true,
          autoAssignToSingleCustomer: true,
          defaultShipmentNotes: true,
          requireCustomerLinkForReady: true,
          isActive: true,
          memberships: {
            where: { userId: session.user.id },
            select: {
              role: true,
              partnerCustomerId: true,
              partnerCustomer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            take: 1,
          },
          _count: {
            select: {
              customers: true,
              shipmentAssignments: true,
            },
          },
        },
      }),
    ]);

    if (!portalWithMeta) {
      return NextResponse.json({ error: 'Partner portal not found' }, { status: 404 });
    }

    return NextResponse.json({ portal: portalWithMeta });
  } catch (error) {
    routeDeps.logger.error('Failed to fetch portal settings', error);
    return NextResponse.json({ error: 'Failed to fetch portal settings' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requesterMembership = await getPartnerPortalMembership(portalId, session.user.id);
    const isInternalManager = canManagePartnerPortals(session.user.role);

    if (!isInternalManager && !canManagePortalMemberships(requesterMembership?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const portal = await getPartnerPortalOrThrow(portalId);
    if (!portal) {
      return NextResponse.json({ error: 'Partner portal not found' }, { status: 404 });
    }

    const payload = updatePortalSettingsSchema.parse(await request.json());
    const normalizedCustomDomain = normalizePortalCustomDomain(payload.customDomain);
    const customDomainChanged = payload.customDomain !== undefined && normalizedCustomDomain !== (portal.customDomain ?? null);

    if (normalizedCustomDomain && !isValidPortalCustomDomain(normalizedCustomDomain)) {
      return NextResponse.json({ error: 'Custom domain must be a valid hostname without http://, https://, ports, or paths.' }, { status: 400 });
    }

    const updatedPortal = await routeDeps.prisma.partnerPortal.update({
      where: { id: portalId },
      data: {
        ...(payload.customDomain !== undefined ? {
          customDomain: normalizedCustomDomain,
          customDomainVerificationToken: normalizedCustomDomain
            ? (customDomainChanged || !portal.customDomainVerificationToken
              ? randomBytes(16).toString('hex')
              : portal.customDomainVerificationToken)
            : null,
          customDomainVerifiedAt: customDomainChanged || !normalizedCustomDomain
            ? null
            : portal.customDomainVerifiedAt,
        } : {}),
        companyLabel: payload.companyLabel || null,
        accentColor: payload.accentColor || null,
        logoUrl: payload.logoUrl || null,
        ...(payload.notifyOnShipmentAssigned !== undefined ? { notifyOnShipmentAssigned: payload.notifyOnShipmentAssigned } : {}),
        ...(payload.autoAssignToSingleCustomer !== undefined ? { autoAssignToSingleCustomer: payload.autoAssignToSingleCustomer } : {}),
        ...(payload.defaultShipmentNotes !== undefined ? { defaultShipmentNotes: payload.defaultShipmentNotes || null } : {}),
        ...(payload.requireCustomerLinkForReady !== undefined ? { requireCustomerLinkForReady: payload.requireCustomerLinkForReady } : {}),
      },
      select: {
        id: true,
        name: true,
        code: true,
        customDomain: true,
        customDomainVerificationToken: true,
        customDomainVerifiedAt: true,
        companyLabel: true,
        accentColor: true,
        logoUrl: true,
        notifyOnShipmentAssigned: true,
        autoAssignToSingleCustomer: true,
        defaultShipmentNotes: true,
        requireCustomerLinkForReady: true,
        isActive: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ portal: updatedPortal });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'That custom domain is already linked to another portal.' }, { status: 409 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }

    routeDeps.logger.error('Failed to update portal settings', error);
    return NextResponse.json({ error: 'Failed to update portal settings' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only internal managers may delete an entire portal. Portal admins can
    // manage members, but deleting the workspace itself is an internal action.
    if (!canManagePartnerPortals(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const portal = await getPartnerPortalOrThrow(portalId);

    if (!portal) {
      return NextResponse.json({ error: 'Partner portal not found' }, { status: 404 });
    }

    // Capture counts before deletion so the audit trail records the scale of
    // what was removed. All child records cascade from the portal.
    const [membershipCount, customerCount, assignmentCount, ledgerCount, paymentCount] = await Promise.all([
      routeDeps.prisma.partnerPortalMembership.count({ where: { portalId } }),
      routeDeps.prisma.partnerCustomer.count({ where: { portalId } }),
      routeDeps.prisma.partnerShipmentAssignment.count({ where: { portalId } }),
      routeDeps.prisma.partnerPortalLedgerEntry.count({ where: { portalId } }),
      routeDeps.prisma.partnerPortalPaymentRecord.count({ where: { portalId } }),
    ]);

    await routeDeps.prisma.partnerPortal.delete({
      where: { id: portalId },
    });

    await createAuditLog(
      'PartnerPortal',
      portalId,
      'DELETE',
      session.user.id,
      {
        portalId,
        portalName: portal.name,
        portalCode: portal.code,
        deletedCounts: {
          memberships: membershipCount,
          customers: customerCount,
          shipmentAssignments: assignmentCount,
          ledgerEntries: ledgerCount,
          paymentRecords: paymentCount,
        },
      },
      request,
    );

    return NextResponse.json({
      success: true,
      deletedCounts: {
        memberships: membershipCount,
        customers: customerCount,
        shipmentAssignments: assignmentCount,
        ledgerEntries: ledgerCount,
        paymentRecords: paymentCount,
      },
    });
  } catch (error) {
    routeDeps.logger.error('Failed to delete partner portal', error);
    return NextResponse.json({ error: 'Failed to delete partner portal' }, { status: 500 });
  }
}