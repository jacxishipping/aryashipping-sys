import { NextRequest, NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/audit';
import { maskEmailAddress } from '@/lib/partner-portal-audit';
import { routeDeps } from '@/lib/route-deps';
import { generateLoginCode } from '@/lib/loginCodeGenerator';
import {
  canManagePartnerPortals,
  canManagePortalMemberships,
  getPartnerPortalMembership,
  getPartnerPortalOrThrow,
} from '@/lib/partner-portals';

async function generateUniqueLoginCode(userId: string) {
  let attempts = 0;

  while (attempts < 10) {
    const candidate = generateLoginCode();
    const existingUser = await routeDeps.prisma.user.findFirst({
      where: {
        loginCode: {
          equals: candidate,
          mode: 'insensitive',
        },
        NOT: {
          id: userId,
        },
      },
      select: { id: true },
    });

    if (!existingUser) {
      return candidate;
    }

    attempts += 1;
  }

  throw new Error('Failed to generate unique login code');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string; membershipId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId, membershipId } = await params;

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

    const targetMembership = await routeDeps.prisma.partnerPortalMembership.findFirst({
      where: {
        id: membershipId,
        portalId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!targetMembership) {
      return NextResponse.json({ error: 'Portal membership not found' }, { status: 404 });
    }

    const canUseLoginCode = targetMembership.user.role === 'user' || targetMembership.role === 'ADMIN';

    if (!canUseLoginCode) {
      return NextResponse.json({ error: 'Login code generation is only available for portal user accounts and portal admins' }, { status: 400 });
    }

    const loginCode = await generateUniqueLoginCode(targetMembership.user.id);

    const updatedUser = await routeDeps.prisma.user.update({
      where: { id: targetMembership.user.id },
      data: { loginCode },
      select: {
        id: true,
        name: true,
        email: true,
        loginCode: true,
      },
    });

    await routeDeps.createNotifications([
      {
        userId: updatedUser.id,
        senderId: session.user.id,
        title: 'Portal login code refreshed',
        description: `A new login code was generated for ${portal.name}. Use ${loginCode} to sign in to your portal workspace.`,
        link: `/portal/${portalId}`,
        type: 'INFO',
      },
    ]);

    await createAuditLog(
      'PartnerPortalMembership',
      targetMembership.id,
      'UPDATE',
      session.user.id,
      {
        portalId,
        userId: updatedUser.id,
        targetName: updatedUser.name || updatedUser.email,
        email: maskEmailAddress(updatedUser.email),
        loginCodeAction: 'REGENERATED',
      },
      request,
    );

    return NextResponse.json({
      success: true,
      user: updatedUser,
      loginCode,
      simpleLoginUrl: `/auth/simple-login?callbackUrl=${encodeURIComponent(`/portal/${portalId}`)}`,
      portalUrl: `/portal/${portalId}`,
    });
  } catch (error) {
    routeDeps.logger.error('Failed to regenerate portal member login code', error);
    return NextResponse.json({ error: 'Failed to regenerate portal member login code' }, { status: 500 });
  }
}