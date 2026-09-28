import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { normalizeShippingRateConfig } from '@/lib/shipping-rate-calculator';
import { extractAuctionRatesFromPdf, getImportedRatesFromPdfText } from '@/lib/shipping-rate-pdf-import';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_SETTINGS = {
  theme: 'futuristic',
  accentColor: 'var(--accent-gold)',
  sidebarDensity: 'comfortable',
  animationsEnabled: true,
  notifyShipmentEmail: true,
  notifyShipmentPush: true,
  notifyPaymentEmail: true,
  notifyCriticalSms: false,
  twoFactorEnabled: false,
  language: 'en',
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'PDF file is required' }, { status: 400 });
    }
    const fileName = file.name.toLowerCase();
    const isPdf = file.type.includes('pdf') || fileName.endsWith('.pdf');
    if (!isPdf) {
      return NextResponse.json({ message: 'Only PDF files can be imported' }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ message: 'PDF file must be 8MB or smaller' }, { status: 400 });
    }

    const existingSettings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });
    const existingConfig = normalizeShippingRateConfig(existingSettings?.calculatorConfig);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { entries: auctionRates, text: extractedText } = await extractAuctionRatesFromPdf(fileBuffer);
    const importedRates = getImportedRatesFromPdfText(auctionRates, extractedText);

    if (Object.keys(importedRates).length === 0) {
      return NextResponse.json({
        message: 'No rates were found in the PDF. Expected the Jacxi branch/city/total table or rows like "CA $1300".',
      }, { status: 422 });
    }

    const config = normalizeShippingRateConfig({
      ...existingConfig,
      destinationLabel: file.name.toLowerCase().includes('islam qala') ? 'Islam Qala, Afghanistan' : existingConfig.destinationLabel,
      stateRates: {
        ...existingConfig.stateRates,
        ...importedRates,
      },
      auctionRates: auctionRates.length ? auctionRates : existingConfig.auctionRates,
      updatedFromPdfName: file.name,
      updatedAt: new Date().toISOString(),
    });

    const settings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...DEFAULT_SETTINGS,
        calculatorConfig: config as unknown as Prisma.InputJsonValue,
      },
      update: {
        calculatorConfig: config as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      config: normalizeShippingRateConfig(settings.calculatorConfig),
      importedRates,
      importedCount: Object.keys(importedRates).length,
      importedAuctionRateCount: auctionRates.length,
      extractedTextPreview: extractedText.slice(0, 700),
    });
  } catch (error) {
    console.error('Error importing shipping rates from PDF:', error);
    return NextResponse.json({
      message: error instanceof Error ? error.message : 'Failed to import PDF rates',
    }, { status: 500 });
  }
}
