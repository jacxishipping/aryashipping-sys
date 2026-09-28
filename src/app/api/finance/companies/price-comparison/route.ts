import { NextRequest, NextResponse } from 'next/server';
import { CompanyType, Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { normalizeShippingRateConfig } from '@/lib/shipping-rate-calculator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'finance:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const companyType = searchParams.get('companyType');
    const companyIds = searchParams.get('companyIds');

    const where: Prisma.CompanyWhereInput = {};

    if (active === 'true' || active === 'false') {
      where.isActive = active === 'true';
    }

    if (companyIds) {
      const ids = companyIds.split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length) {
        where.id = { in: ids };
      }
    }

    if (companyType && Object.values(CompanyType).includes(companyType as CompanyType)) {
      const boolField =
        companyType === 'DISPATCH' ? 'isDispatch' :
        companyType === 'TRANSIT' ? 'isTransit' :
        companyType === 'SHIPPING' ? 'isShipping' : null;

      if (boolField) {
        where.OR = [
          ...(Array.isArray(where.OR) ? where.OR : []),
          { companyType: companyType as CompanyType },
          { [boolField]: true },
        ];
      } else {
        where.companyType = companyType as CompanyType;
      }
    }

    const companies = await prisma.company.findMany({
      where,
      select: {
        id: true,
        name: true,
        code: true,
        companyType: true,
        isActive: true,
        priceListConfig: true,
        priceLists: {
          where: { isActive: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            destinationLabel: true,
            sourceFileName: true,
            importedAuctionRateCount: true,
            importedStateRateCount: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            priceLists: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const payload = companies.map((company) => {
      const config = normalizeShippingRateConfig(company.priceListConfig);
      const activePriceList = company.priceLists[0] ?? null;
      const hasPriceList = company._count.priceLists > 0 || Boolean(config.updatedFromPdfName);

      return {
        id: company.id,
        name: company.name,
        code: company.code,
        companyType: company.companyType,
        isActive: company.isActive,
        destinationLabel: config.destinationLabel,
        hasPriceList,
        stateRates: config.stateRates,
        auctionRates: config.auctionRates,
        fallbackRate: config.fallbackRate,
        vehicleTypes: config.vehicleTypes,
        currency: config.currency,
        updatedAt: config.updatedAt,
        activePriceList,
      };
    });

    return NextResponse.json({ companies: payload });
  } catch (error) {
    console.error('Error fetching company price comparison data:', error);
    return NextResponse.json({ error: 'Failed to fetch company price comparison data' }, { status: 500 });
  }
}