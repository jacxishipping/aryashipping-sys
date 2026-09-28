import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { normalizeShippingRateConfig } from '@/lib/shipping-rate-calculator';
import { createSystemAuditLog } from '@/lib/system-audit';

export async function POST(
  _request: NextRequest,
  props: { params: Promise<{ id: string; priceListId: string }> },
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const priceList = await prisma.companyPriceList.findFirst({
      where: {
        id: params.priceListId,
        companyId: params.id,
      },
    });

    if (!priceList) {
      return NextResponse.json({ error: 'Price list not found' }, { status: 404 });
    }

    const config = normalizeShippingRateConfig(priceList.config);

    await prisma.$transaction([
      prisma.companyPriceList.updateMany({
        where: { companyId: params.id, isActive: true },
        data: { isActive: false },
      }),
      prisma.companyPriceList.update({
        where: { id: priceList.id },
        data: { isActive: true },
      }),
      prisma.company.update({
        where: { id: params.id },
        data: {
          priceListConfig: config as unknown as Prisma.InputJsonValue,
        },
      }),
    ]);

    await createSystemAuditLog({
      action: 'price-list-activation',
      entityType: 'COMPANY_PRICE_LIST',
      entityId: priceList.id,
      actorUserId: session.user.id as string,
      summary: `Activated price list ${priceList.name}`,
      metadata: {
        companyId: params.id,
        priceListId: priceList.id,
        sourceFileName: priceList.sourceFileName,
        destinationLabel: priceList.destinationLabel,
      },
    }).catch(() => null);

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error activating company price list:', error);
    return NextResponse.json({ error: 'Failed to activate price list' }, { status: 500 });
  }
}
