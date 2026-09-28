import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sanitizeLoginCodeAuditChanges } from '@/lib/partner-portal-audit';

// GET - Fetch audit logs
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can view audit logs
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get('entityId');
    const entityType = searchParams.get('entityType');
    const performedBy = searchParams.get('performedBy');
    const action = searchParams.get('action');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause
    const where: Record<string, string> = {};

    if (entityId) {
      where.entityId = entityId;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (performedBy) {
      where.performedBy = performedBy;
    }

    if (action && ['CREATE', 'UPDATE', 'DELETE'].includes(action)) {
      where.action = action;
    }

    // Get total count and fetch logs
    const [totalCount, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: {
          performedAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const relatedUserIds = Array.from(new Set([
      ...logs.map((log) => log.performedBy),
      ...logs.map((log) => {
        const changes = (log.changes ?? {}) as Record<string, unknown>;
        return typeof changes.userId === 'string' ? changes.userId : null;
      }).filter((value): value is string => Boolean(value)),
    ]));

    const relatedPortalIds = Array.from(new Set(
      logs.map((log) => {
        const changes = (log.changes ?? {}) as Record<string, unknown>;
        return typeof changes.portalId === 'string' ? changes.portalId : null;
      }).filter((value): value is string => Boolean(value))
    ));

    const [users, portals] = await Promise.all([
      relatedUserIds.length > 0
        ? prisma.user.findMany({
            where: { id: { in: relatedUserIds } },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([]),
      relatedPortalIds.length > 0
        ? prisma.partnerPortal.findMany({
            where: { id: { in: relatedPortalIds } },
            select: { id: true, name: true, code: true },
          })
        : Promise.resolve([]),
    ]);

    const userMap = new Map(users.map((user) => [user.id, user]));
    const portalMap = new Map(portals.map((portal) => [portal.id, portal]));

    const enrichedLogs = logs.map((log) => {
      const changes = (log.changes ?? {}) as Record<string, unknown>;
      const targetUserId = typeof changes.userId === 'string' ? changes.userId : null;
      const portalIdFromChanges = typeof changes.portalId === 'string' ? changes.portalId : null;
      const actor = userMap.get(log.performedBy) || null;
      const target = targetUserId ? userMap.get(targetUserId) || null : null;
      const portal = portalIdFromChanges ? portalMap.get(portalIdFromChanges) || null : null;

      return {
        ...log,
        actor,
        target,
        portal,
        changes: log.entityType === 'PartnerPortalMembership' ? sanitizeLoginCodeAuditChanges(changes) : changes,
      };
    });

    return NextResponse.json({
      logs: enrichedLogs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
