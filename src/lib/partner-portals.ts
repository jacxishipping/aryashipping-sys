import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';

export const PARTNER_PORTAL_ADMIN_ROLE = 'ADMIN';

export function canManagePartnerPortals(role: string | null | undefined) {
  return hasPermission(role, 'users:manage') || hasPermission(role, 'customers:manage');
}

export function canReadPartnerPortalCustomers(role: string | null | undefined) {
  return hasPermission(role, 'customers:view') || hasPermission(role, 'customers:manage');
}

export function canReadPartnerPortalShipments(role: string | null | undefined) {
  return hasPermission(role, 'shipments:read_all') || hasPermission(role, 'shipments:manage');
}

export function canAssignShipmentsToPartnerPortals(role: string | null | undefined) {
  return hasPermission(role, 'shipments:manage');
}

export function canManagePortalMemberships(membershipRole: string | null | undefined) {
  return membershipRole === PARTNER_PORTAL_ADMIN_ROLE;
}

export function getPortalMembershipCustomerScope(membership: { partnerCustomerId?: string | null } | null | undefined) {
  return membership?.partnerCustomerId || null;
}

export function isCustomerScopedPortalMembership(membership: { partnerCustomerId?: string | null } | null | undefined) {
  return Boolean(getPortalMembershipCustomerScope(membership));
}

export async function getPartnerPortalMembership(portalId: string, userId: string) {
  return prisma.partnerPortalMembership.findUnique({
    where: {
      portalId_userId: {
        portalId,
        userId,
      },
    },
    include: {
      partnerCustomer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      portal: {
        select: {
          id: true,
          name: true,
          code: true,
          customDomain: true,
          customDomainVerificationToken: true,
          customDomainVerifiedAt: true,
          isActive: true,
        },
      },
    },
  });
}

export async function getPartnerPortalOrThrow(portalId: string) {
  return prisma.partnerPortal.findUnique({
    where: { id: portalId },
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
}

export async function syncPortalShipmentsForUser(portalId: string, userId: string, actorId: string) {
  const shipments = await prisma.shipment.findMany({
    where: {
      userId,
      partnerPortalAssignment: null,
    },
    select: { id: true },
  });

  if (shipments.length === 0) {
    return { count: 0 };
  }

  const result = await prisma.partnerShipmentAssignment.createMany({
    data: shipments.map((shipment) => ({
      portalId,
      shipmentId: shipment.id,
      assignedBy: actorId,
    })),
    skipDuplicates: true,
  });

  return { count: result.count };
}

export async function syncPortalShipmentsFromPrimaryMember(portalId: string, actorId: string) {
  const primaryMembership = await prisma.partnerPortalMembership.findFirst({
    where: {
      portalId,
      role: PARTNER_PORTAL_ADMIN_ROLE,
      user: {
        role: 'user',
      },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      userId: true,
    },
  });

  if (!primaryMembership?.userId) {
    return { count: 0 };
  }

  return syncPortalShipmentsForUser(portalId, primaryMembership.userId, actorId);
}