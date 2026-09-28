import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { routeDeps } from '@/lib/route-deps';

function buildReleaseToken() {
  return `REL-${randomBytes(4).toString('hex').toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

export async function POST(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await routeDeps.auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!routeDeps.hasPermission(session.user?.role, 'shipments:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const shipment = await routeDeps.prisma.shipment.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        container: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const isReleased = String(shipment.status) === 'RELEASED' || shipment.container?.status === 'RELEASED';

    if (!isReleased) {
      return NextResponse.json(
        { error: 'Release token can be generated only for released shipments' },
        { status: 400 }
      );
    }

    let token = buildReleaseToken();

    for (let i = 0; i < 5; i++) {
      const existingRows = await routeDeps.prisma.$queryRaw<Array<{ count: number }>>(
        Prisma.sql`SELECT COUNT(*)::int AS count FROM "Shipment" WHERE "releaseToken" = ${token}`
      );

      if ((existingRows?.[0]?.count ?? 0) === 0) {
        break;
      }

      token = buildReleaseToken();
    }

    await routeDeps.prisma.$executeRaw(
      Prisma.sql`UPDATE "Shipment" SET "releaseToken" = ${token}, "releaseTokenCreatedAt" = ${new Date()}, "updatedAt" = ${new Date()} WHERE "id" = ${shipment.id}`
    );

    const rows = await routeDeps.prisma.$queryRaw<
      Array<{ id: string; releaseToken: string | null; releaseTokenCreatedAt: Date | null }>
    >(
      Prisma.sql`SELECT "id", "releaseToken", "releaseTokenCreatedAt" FROM "Shipment" WHERE "id" = ${shipment.id}`
    );

    const updatedShipment = rows[0];

    return NextResponse.json({ shipment: updatedShipment });
  } catch (error) {
    console.error('Error generating release token:', error);
    return NextResponse.json({ error: 'Failed to generate release token' }, { status: 500 });
  }
}
