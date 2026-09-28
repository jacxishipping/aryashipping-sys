import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  getStoredAiProviderSettings,
  maskSecret,
  saveStoredAiProviderSettings,
  type AiProviderSettingsValues,
} from '@/lib/ai/provider-settings';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const aiProviderSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  provider: z.string().trim().min(1).max(80).optional(),
  apiKey: z.string().optional(),
  chatCompletionsUrl: z.string().trim().url().optional(),
  modelsUrl: z.string().trim().url().optional(),
  model: z.string().trim().min(1).max(120).optional(),
  maxTokens: z.number().int().min(1).max(4000).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return null;
  }

  return session;
}

function toClientSettings(settings: AiProviderSettingsValues, options?: { apiKeyNeedsReset?: boolean }) {
  return {
    ...settings,
    apiKeyMasked: maskSecret(settings.apiKey),
    apiKeyConfigured: Boolean(settings.apiKey),
    apiKeyNeedsReset: Boolean(options?.apiKeyNeedsReset),
    apiKey: '',
  };
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const [settings, raw] = await Promise.all([
      getStoredAiProviderSettings(),
      prisma.aiProviderSettings.findUnique({
        where: { scope: 'default' },
        select: { apiKey: true },
      }),
    ]);

    const apiKeyNeedsReset = Boolean(raw?.apiKey && !settings.apiKey.trim());
    return NextResponse.json({ settings: toClientSettings(settings, { apiKeyNeedsReset }) }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to load AI provider settings.' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const actorUserId = session.user.id as string;

    const payload = aiProviderSettingsSchema.parse(await request.json());
    const partial = { ...payload } satisfies Partial<AiProviderSettingsValues>;
    if (payload.apiKey === '') {
      delete partial.apiKey;
    }

    const current = await getStoredAiProviderSettings();
    const next: AiProviderSettingsValues = {
      ...current,
      ...partial,
    };

    if (next.enabled && !next.apiKey.trim()) {
      return NextResponse.json(
        { message: 'AI API key is required when AI provider is enabled. Please paste the key and save again.' },
        { status: 400 },
      );
    }

    if (next.enabled && !next.chatCompletionsUrl.trim()) {
      return NextResponse.json(
        { message: 'Chat Completions URL is required when AI provider is enabled.' },
        { status: 400 },
      );
    }

    if (next.enabled && !next.model.trim()) {
      return NextResponse.json(
        { message: 'Model is required when AI provider is enabled.' },
        { status: 400 },
      );
    }

    const settings = await saveStoredAiProviderSettings(partial);
    const raw = await prisma.aiProviderSettings.findUnique({
      where: { scope: 'default' },
      select: { apiKey: true },
    });
    const apiKeyNeedsReset = Boolean(raw?.apiKey && !settings.apiKey.trim());

    await createAuditLog(
      'SETTINGS',
      'ai-provider',
      'UPDATE',
      actorUserId,
      {
        summary: `Updated AI provider settings fields: ${Object.keys(payload).join(', ')}`,
        updatedFields: Object.keys(payload).filter((key) => key !== 'apiKey'),
        apiKeyUpdated: Object.prototype.hasOwnProperty.call(payload, 'apiKey') && Boolean(payload.apiKey),
      },
      request,
    );

    return NextResponse.json({ settings: toClientSettings(settings, { apiKeyNeedsReset }) }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid AI provider settings.', details: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to save AI provider settings.' },
      { status: 500 },
    );
  }
}
