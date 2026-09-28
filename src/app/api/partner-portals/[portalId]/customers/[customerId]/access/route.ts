import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';
import { generateLoginCode } from '@/lib/loginCodeGenerator';
import { maskEmailAddress } from '@/lib/partner-portal-audit';
import { routeDeps } from '@/lib/route-deps';
import {
  canManagePartnerPortals,
  canManagePortalMemberships,
  getPartnerPortalMembership,
  getPartnerPortalOrThrow,
} from '@/lib/partner-portals';

const issuePortalCustomerAccessSchema = z.object({
  email: z.string().trim().email().optional(),
  name: z.string().trim().min(1).optional(),
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
  { params }: { params: Promise<{ portalId: string; customerId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId, customerId } = await params;

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

    const payload = issuePortalCustomerAccessSchema.parse(await request.json());

    const customer = await routeDeps.prisma.partnerCustomer.findFirst({
      where: {
        id: customerId,
        portalId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        country: true,
        memberships: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: {
            id: true,
            userId: true,
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                loginCode: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Portal customer not found' }, { status: 404 });
    }

    const normalizedEmail = (payload.email || customer.email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Customer email is required before portal access can be issued' }, { status: 400 });
    }

    const existingUser = customer.memberships[0]?.user || await routeDeps.prisma.user.findUnique({
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
      return NextResponse.json({ error: 'Only customer-style user accounts can receive portal customer access' }, { status: 400 });
    }

    const loginCode = await ensureUniqueLoginCode(existingUser?.id);

    const user = existingUser
      ? await routeDeps.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: payload.name || customer.name || existingUser.name,
            email: normalizedEmail,
            phone: customer.phone || undefined,
            city: customer.city || undefined,
            country: customer.country || undefined,
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
            name: payload.name || customer.name,
            email: normalizedEmail,
            passwordHash: await bcrypt.hash(randomBytes(24).toString('hex'), 12),
            role: 'user',
            phone: customer.phone || undefined,
            city: customer.city || undefined,
            country: customer.country || undefined,
            loginCode,
          },
          select: {
            id: true,
            name: true,
            email: true,
            loginCode: true,
          },
        });

    if (customer.email !== normalizedEmail) {
      await routeDeps.prisma.partnerCustomer.update({
        where: { id: customer.id },
        data: {
          email: normalizedEmail,
        },
      });
    }

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
        partnerCustomerId: true,
      },
    });

    if (existingMembership && !existingMembership.partnerCustomerId) {
      return NextResponse.json({ error: 'That email already belongs to a full portal member. Use a different email for customer-scoped access.' }, { status: 409 });
    }

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
        partnerCustomerId: customer.id,
        role: 'STAFF',
        createdBy: session.user.id,
      },
      update: {
        partnerCustomerId: customer.id,
        role: 'STAFF',
      },
    });

    await routeDeps.createNotifications([
      {
        userId: user.id,
        senderId: session.user.id,
        title: 'Portal customer access granted',
        description: `Use login code ${loginCode} to open your customer portal for ${portal.name}.`,
        link: `/portal/${portalId}/finance/${customer.id}`,
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
          partnerCustomerId: customer.id,
          targetName: user.name || user.email,
          role: 'STAFF',
          loginCodeAction: 'ISSUED',
          email: maskEmailAddress(user.email),
        },
        request,
      );
    } else {
      await createAuditLog(
        'PartnerPortalMembership',
        membership.id,
        'UPDATE',
        session.user.id,
        {
          portalId,
          userId: user.id,
          previousPartnerCustomerId: existingMembership.partnerCustomerId,
          nextPartnerCustomerId: customer.id,
          previousRole: existingMembership.role,
          nextRole: 'STAFF',
          targetName: user.name || user.email,
          loginCodeAction: 'REISSUED',
          email: maskEmailAddress(user.email),
        },
        request,
      );
    }

    return NextResponse.json({
      user,
      membership,
      loginCode,
      simpleLoginUrl: `/auth/simple-login?callbackUrl=${encodeURIComponent(`/portal/${portalId}/finance/${customer.id}`)}`,
      portalUrl: `/portal/${portalId}/finance/${customer.id}`,
      customer: {
        id: customer.id,
        name: customer.name,
        email: normalizedEmail,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }

    routeDeps.logger.error('Failed to issue portal customer access', error);
    return NextResponse.json({ error: 'Failed to issue portal customer access' }, { status: 500 });
  }
}