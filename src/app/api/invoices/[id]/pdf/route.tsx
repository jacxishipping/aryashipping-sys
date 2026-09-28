import { NextRequest, NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { prisma } from '@/lib/db';
import InvoiceTemplate from '@/components/invoices/pdf/InvoiceTemplate';
import { auth } from '@/lib/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Params are async in Next.js 15
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }
        
        const { id } = await params;

        const invoice = await prisma.userInvoice.findUnique({
            where: { id },
            include: {
                user: true,
                container: true,
                lineItems: true
            }
        });

        if (!invoice) {
            return new NextResponse('Invoice not found', { status: 404 });
        }

        // Render PDF
        // @ts-ignore - renderToStream types can be tricky with NextResponse
        const stream = await renderToStream(<InvoiceTemplate invoice={invoice} />);
        
        return new NextResponse(stream as unknown as BodyInit, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
            },
        });
    } catch (error) {
        console.error('PDF Generation Error:', error);
        return new NextResponse('Error generating PDF', { status: 500 });
    }
}
