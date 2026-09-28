import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createTokenRouterChatCompletion, isTokenRouterConfigured } from '@/lib/ai/tokenrouter';
import { getEffectiveAiProviderSettings, isAiProviderConfigured, maskSecret } from '@/lib/ai/provider-settings';

export const dynamic = 'force-dynamic';

const TOKENROUTER_PROVIDER = 'tokenrouter-ai';
const LOOKBACK_HOURS = 24;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return null;
  }

  return session;
}

async function buildAiConnectivityStatus() {
  const providerSettings = await getEffectiveAiProviderSettings();
  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);
  const [recentLogs, latestLog, latestSuccess, latestFailure] = await Promise.all([
    prisma.aiInteractionLog.findMany({
      where: {
        createdAt: { gte: since },
      },
      select: {
        provider: true,
        status: true,
      },
      take: 500,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.aiInteractionLog.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        provider: true,
        model: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.aiInteractionLog.findFirst({
      where: { status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
      select: {
        provider: true,
        model: true,
        createdAt: true,
      },
    }),
    prisma.aiInteractionLog.findFirst({
      where: { status: { not: 'SUCCESS' } },
      orderBy: { createdAt: 'desc' },
      select: {
        provider: true,
        model: true,
        status: true,
        response: true,
        responsePayload: true,
        createdAt: true,
      },
    }),
  ]);

  const providerRuns = recentLogs.filter((log) => log.provider !== 'rules');
  const fallbackRuns = recentLogs.filter((log) => log.provider === 'rules');
  const providerSuccessRuns = providerRuns.filter((log) => log.status === 'SUCCESS');
  const failedRuns = recentLogs.filter((log) => log.status !== 'SUCCESS' && log.provider !== 'rules');
  const tokenRouterRuns = recentLogs.filter((log) => log.provider === TOKENROUTER_PROVIDER);

  return {
    provider: providerSettings.provider || TOKENROUTER_PROVIDER,
    configured: isAiProviderConfigured(providerSettings),
    enabled: providerSettings.enabled,
    model: providerSettings.model,
    chatCompletionsUrl: providerSettings.chatCompletionsUrl,
    modelsUrl: providerSettings.modelsUrl,
    maxTokens: providerSettings.maxTokens,
    temperature: providerSettings.temperature,
    maskedApiKey: maskSecret(providerSettings.apiKey),
    lookbackHours: LOOKBACK_HOURS,
    stats: {
      totalRuns: recentLogs.length,
      providerRuns: providerRuns.length,
      tokenRouterRuns: tokenRouterRuns.length,
      fallbackRuns: fallbackRuns.length,
      successRuns: providerSuccessRuns.length,
      failedRuns: failedRuns.length,
      successRate: providerRuns.length > 0 ? Math.round((providerSuccessRuns.length / providerRuns.length) * 100) : null,
    },
    latestLog: latestLog
      ? {
          provider: latestLog.provider,
          model: latestLog.model,
          status: latestLog.status,
          createdAt: latestLog.createdAt.toISOString(),
        }
      : null,
    latestSuccess: latestSuccess
      ? {
          provider: latestSuccess.provider,
          model: latestSuccess.model,
          createdAt: latestSuccess.createdAt.toISOString(),
        }
      : null,
    latestFailure: latestFailure
      ? {
        provider: latestFailure.provider,
        model: latestFailure.model,
        status: latestFailure.status,
        reason:
          typeof latestFailure.responsePayload === 'object' &&
          latestFailure.responsePayload &&
          'error' in latestFailure.responsePayload &&
          typeof latestFailure.responsePayload.error === 'string'
            ? latestFailure.responsePayload.error
            : latestFailure.response || null,
        createdAt: latestFailure.createdAt.toISOString(),
      }
      : null,
  };
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(await buildAiConnectivityStatus(), { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to load AI connectivity status.' },
      { status: 500 },
    );
  }
}

export async function POST(_request: NextRequest) {
  const startedAt = Date.now();

  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!(await isTokenRouterConfigured())) {
      return NextResponse.json(
        {
          message: 'AI provider is not configured. Save an enabled API key and endpoint in Settings > AI.',
          status: await buildAiConnectivityStatus(),
        },
        { status: 400 },
      );
    }

    const completion = await createTokenRouterChatCompletion(
      [
        {
          role: 'system',
          content: 'You are a connectivity check. Reply with a short confirmation only.',
        },
        {
          role: 'user',
          content: 'Reply with exactly: AI connectivity ok',
        },
      ],
      {
        maxTokens: 20,
        temperature: 0,
      },
    );

    const latencyMs = Date.now() - startedAt;

    await prisma.aiInteractionLog.create({
      data: {
        feature: 'ai-connectivity-test',
        entityType: 'SETTINGS',
        actorUserId: session.user.id,
        provider: TOKENROUTER_PROVIDER,
        model: completion.model,
        prompt: 'Reply with exactly: AI connectivity ok',
        response: completion.content,
        requestPayload: {
          model: completion.model,
          maxTokens: 20,
          temperature: 0,
        },
        responsePayload: {
          content: completion.content,
          latencyMs,
        },
        status: 'SUCCESS',
      },
    });

    return NextResponse.json(
      {
        ok: true,
        latencyMs,
        model: completion.model,
        responsePreview: completion.content.slice(0, 120),
        status: await buildAiConnectivityStatus(),
      },
      { status: 200 },
    );
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const providerSettings = await getEffectiveAiProviderSettings();
    const message = error instanceof Error ? error.message : 'AI connectivity test failed.';

    try {
      const session = await auth();
      await prisma.aiInteractionLog.create({
        data: {
          feature: 'ai-connectivity-test',
          entityType: 'SETTINGS',
          actorUserId: session?.user?.id ?? null,
          provider: TOKENROUTER_PROVIDER,
          model: providerSettings.model,
          prompt: 'Reply with exactly: AI connectivity ok',
          response: message,
          requestPayload: {
            model: providerSettings.model,
            maxTokens: 20,
            temperature: 0,
          },
          responsePayload: {
            error: message,
            latencyMs,
          },
          status: 'FAILED',
        },
      });
    } catch {
      // Do not hide the provider failure behind a logging failure.
    }

    return NextResponse.json({ message, latencyMs, status: await buildAiConnectivityStatus() }, { status: 500 });
  }
}
