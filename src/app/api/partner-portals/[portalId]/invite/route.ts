import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
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

const invitePortalUserSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().max(50).optional(),
  city: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  membershipRole: z.enum(['ADMIN', 'STAFF']).default('STAFF'),
});

async function ensureUniqueLoginCode(userIdToExclude?: string) {
  let attempts = 0;

  while (attempts < 12) {
    const loginCode = generateLoginCode();
    const existing = await routeDeps.prisma.user.findFirst({
      where: {
        loginCode: { equals: loginCode, mode: 'insensitive' },
        ...(userIdToExclude ? { NOT: { id: userIdToExclude } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return loginCode;
    }

    attempts += 1;
  }

  throw new Error('Failed to generate a unique login code');
}

export async function POST(
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

    const payload = invitePortalUserSchema.parse(await request.json());
    const normalizedEmail = payload.email.toLowerCase();

    const existingUser = await routeDeps.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        loginCode: true,
      },
    });

    if (existingUser && existingUser.role !== 'user') {
      return NextResponse.json({ error: 'Only customer-style user accounts can be invited into partner portals' }, { status: 400 });
    }

    const loginCode = existingUser?.loginCode || await ensureUniqueLoginCode(existingUser?.id);

    const user = existingUser
      ? await routeDeps.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: existingUser.name || payload.name,
            phone: payload.phone || undefined,
            city: payload.city || undefined,
            country: payload.country || undefined,
            loginCode,
          },
          select: {
            id: true,
            name: true,
            email: true,
            loginCode: true,
          },
        })
      : await routeDeps.prisma.user.create({
          data: {
            name: payload.name,
            email: normalizedEmail,
            passwordHash: await bcrypt.hash(randomBytes(24).toString('hex'), 12),
            role: 'user',
            phone: payload.phone,
            city: payload.city,
            country: payload.country,
            loginCode,
          },
          select: {
            id: true,
            name: true,
            email: true,
            loginCode: true,
          },
        });

        const existingMembership = await routeDeps.prisma.partnerPortalMembership.findUnique({
          where: {
            portalId_userId: {
              portalId,
              userId: user.id,
            },
          },
          select: {
            id: true,
            role: true,
          },
        });

    const membership = await routeDeps.prisma.partnerPortalMembership.upsert({
      where: {
        portalId_userId: {
          portalId,
          userId: user.id,
        },
      },
      create: {
        portalId,
        userId: user.id,
        role: payload.membershipRole,
        createdBy: session.user.id,
      },
      update: {
        role: payload.membershipRole,
      },
    });

    await routeDeps.createNotifications([
      {
        userId: user.id,
        senderId: session.user.id,
        title: 'Partner portal access granted',
        description: `You now have access to ${portal.name}. Use login code ${loginCode} to sign in, then open your portal workspace.`,
        link: `/portal/${portalId}`,
        type: 'INFO',
      },
    ]);

    if (!existingMembership) {
      await createAuditLog(
        'PartnerPortalMembership',
        membership.id,
        'CREATE',
        session.user.id,
        {
          portalId,
          userId: user.id,
          targetName: user.name || user.email,
          role: payload.membershipRole,
          loginCodeAction: 'ISSUED',
          email: maskEmailAddress(user.email),
        },
        request,
      );
    } else if (existingMembership.role !== payload.membershipRole) {
      await createAuditLog(
        'PartnerPortalMembership',
        membership.id,
        'UPDATE',
        session.user.id,
        {
          portalId,
          userId: user.id,
          targetName: user.name || user.email,
          previousRole: existingMembership.role,
          nextRole: payload.membershipRole,
          email: maskEmailAddress(user.email),
        },
        request,
      );
    }

    return NextResponse.json({
      user,
      membership,
      loginCode,
      simpleLoginUrl: `/auth/simple-login?callbackUrl=${encodeURIComponent(`/portal/${portalId}`)}`,
      portalUrl: `/portal/${portalId}`,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }

    routeDeps.logger.error('Failed to invite portal user', error);
    return NextResponse.json({ error: 'Failed to invite portal user' }, { status: 500 });
  }
}