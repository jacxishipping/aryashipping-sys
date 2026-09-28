import { NextRequest, NextResponse } from 'next/server';
import { routeDeps } from '@/lib/route-deps';
import {
  canManagePartnerPortals,
  canManagePortalMemberships,
  getPartnerPortalMembership,
  getPartnerPortalOrThrow,
} from '@/lib/partner-portals';
import { sanitizeLoginCodeAuditChanges } from '@/lib/partner-portal-audit';

type AuditChanges = Record<string, unknown> | null | undefined;

function getStringValue(record: AuditChanges, key: string) {
  const value = record?.[key];
  return typeof value === 'string' ? value : null;
}

function buildActivitySummary(input: {
  action: string;
  actorName: string;
  targetName: string;
  changes: AuditChanges;
}) {
  const { action, actorName, targetName, changes } = input;
  const previousRole = getStringValue(changes, 'previousRole');
  const nextRole = getStringValue(changes, 'nextRole') || getStringValue(changes, 'role');
  const loginCodeAction = getStringValue(changes, 'loginCodeAction');

  if (loginCodeAction === 'REGENERATED') {
    return `${actorName} refreshed the login code for ${targetName}`;
  }

  if (loginCodeAction === 'ISSUED') {
    return `${actorName} issued portal access for ${targetName}`;
  }

  if (action === 'CREATE') {
    return nextRole ? `${actorName} added ${targetName} as ${nextRole}` : `${actorName} added ${targetName} to the portal`;
  }

  if (action === 'DELETE') {
    return `${actorName} removed ${targetName} from the portal`;
  }

  if (previousRole && nextRole) {
    return `${actorName} changed ${targetName} from ${previousRole} to ${nextRole}`;
  }

  return `${actorName} updated ${targetName}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const portal = await getPartnerPortalOrThrow(portalId);

    if (!portal) {
      return NextResponse.json({ error: 'Partner portal not found' }, { status: 404 });
    }

    const requesterMembership = await getPartnerPortalMembership(portalId, session.user.id);
    const isInternalManager = canManagePartnerPortals(session.user.role);

    if (!isInternalManager && !canManagePortalMemberships(requesterMembership?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(50, Math.max(1, Number.parseInt(searchParams.get('limit') || '12', 10) || 12));
    const actionFilter = searchParams.get('action');
    const actorFilter = searchParams.get('actor')?.trim();

    let actorIds: string[] | null = null;

    if (actorFilter) {
      const matchingActors = await routeDeps.prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: actorFilter, mode: 'insensitive' } },
            { email: { contains: actorFilter, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });

      actorIds = matchingActors.map((user) => user.id);

      if (actorIds.length === 0) {
        return NextResponse.json({ portal, activities: [] });
      }
    }

    const memberships = await routeDeps.prisma.partnerPortalMembership.findMany({
      where: { portalId },
      select: {
        id: true,
        role: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const membershipMap = new Map(memberships.map((membership) => [membership.id, membership]));
    const membershipIds = memberships.map((membership) => membership.id);

    const logs = await routeDeps.prisma.auditLog.findMany({
      where: {
        entityType: 'PartnerPortalMembership',
        ...(actionFilter && ['CREATE', 'UPDATE', 'DELETE'].includes(actionFilter) ? { action: actionFilter as 'CREATE' | 'UPDATE' | 'DELETE' } : {}),
        ...(actorIds ? { performedBy: { in: actorIds } } : {}),
        OR: [
          ...(membershipIds.length > 0 ? [{ entityId: { in: membershipIds } }] : []),
          { changes: { path: ['portalId'], equals: portalId } },
        ],
      },
      orderBy: { performedAt: 'desc' },
      take: limit,
    });

    const relatedUserIds = Array.from(new Set([
      ...logs.map((log) => log.performedBy),
      ...logs.map((log) => {
        const changes = (log.changes ?? {}) as Record<string, unknown>;
        return typeof changes.userId === 'string' ? changes.userId : null;
      }).filter((value): value is string => Boolean(value)),
      ...memberships.map((membership) => membership.user.id),
    ]));

    const users = relatedUserIds.length > 0
      ? await routeDeps.prisma.user.findMany({
          where: { id: { in: relatedUserIds } },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : [];

    const userMap = new Map(users.map((user) => [user.id, user]));

    const activities = logs.map((log) => {
      const rawChanges = (log.changes ?? {}) as Record<string, unknown>;
      const sanitizedChanges = sanitizeLoginCodeAuditChanges(rawChanges);
      const targetUserId = typeof rawChanges.userId === 'string'
        ? rawChanges.userId
        : membershipMap.get(log.entityId)?.user.id || null;
      const targetUser = targetUserId ? userMap.get(targetUserId) : null;
      const targetName = (typeof rawChanges.targetName === 'string' && rawChanges.targetName)
        || targetUser?.name
        || targetUser?.email
        || 'Member';
      const actor = userMap.get(log.performedBy);
      const actorName = actor?.name || actor?.email || 'System';

      return {
        id: log.id,
        action: log.action,
        performedAt: log.performedAt,
        actor: actor ? { id: actor.id, name: actor.name, email: actor.email } : { id: log.performedBy, name: null, email: null },
        target: targetUser ? { id: targetUser.id, name: targetUser.name, email: targetUser.email } : { id: targetUserId, name: targetName, email: null },
        summary: buildActivitySummary({
          action: log.action,
          actorName,
          targetName,
          changes: rawChanges,
        }),
        changes: sanitizedChanges,
      };
    });

    return NextResponse.json({ portal, activities });
  } catch (error) {
    routeDeps.logger.error('Failed to fetch portal activity', error);
    return NextResponse.json({ error: 'Failed to fetch portal activity' }, { status: 500 });
  }
}