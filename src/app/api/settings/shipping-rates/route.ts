import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { normalizeShippingRateConfig } from '@/lib/shipping-rate-calculator';

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

async function getOrCreateSettings(userId: string) {
  const existing = await prisma.userSettings.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.userSettings.create({
    data: {
      userId,
      ...DEFAULT_SETTINGS,
      calculatorConfig: normalizeShippingRateConfig(null) as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getOrCreateSettings(session.user.id);
    return NextResponse.json({
      config: normalizeShippingRateConfig(settings.calculatorConfig),
    });
  } catch (error) {
    console.error('Error fetching shipping rate settings:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const payload = await request.json();
    const config = normalizeShippingRateConfig({
      ...payload,
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
    });
  } catch (error) {
    console.error('Error updating shipping rate settings:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
