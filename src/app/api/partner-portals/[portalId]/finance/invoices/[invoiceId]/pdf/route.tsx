import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import { routeDeps } from '@/lib/route-deps';
import InvoiceTemplate from '@/components/invoices/pdf/InvoiceTemplate';
import {
  canManagePartnerPortals,
  canReadPartnerPortalCustomers,
  canReadPartnerPortalShipments,
  getPartnerPortalMembership,
} from '@/lib/partner-portals';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string; invoiceId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId, invoiceId } = await params;

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const membership = await getPartnerPortalMembership(portalId, session.user.id);
    const hasInternalAccess = canManagePartnerPortals(session.user.role)
      || canReadPartnerPortalCustomers(session.user.role)
      || canReadPartnerPortalShipments(session.user.role);

    if (!membership && !hasInternalAccess) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const invoice = await routeDeps.prisma.userInvoice.findFirst({
      where: {
        id: invoiceId,
        status: { not: 'CANCELLED' },
        shipment: {
          partnerPortalAssignment: {
            portalId,
          },
        },
      },
      include: {
        user: true,
        container: true,
        lineItems: true,
      },
    });

    if (!invoice) {
      return new NextResponse('Invoice not found', { status: 404 });
    }

    const disposition = request.nextUrl.searchParams.get('download') === '1' ? 'attachment' : 'inline';

    // @ts-ignore renderToStream returns a web-compatible stream for NextResponse
    const stream = await renderToStream(<InvoiceTemplate invoice={invoice} />);

    return new NextResponse(stream as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    routeDeps.logger.error('Failed to generate partner portal invoice pdf', error);
    return new NextResponse('Error generating PDF', { status: 500 });
  }
}