import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { createTokenRouterChatCompletion, isTokenRouterConfigured } from '@/lib/ai/tokenrouter';
import { createAiInteractionLog } from '@/lib/ai/audit';
import {
  buildDashboardAssistantPrompt,
  buildHeuristicDashboardAssistantBrief,
  dashboardAssistantRequestSchema,
} from '@/lib/ai/dashboard-assistant';
import { z } from 'zod';

function getRequestIdentifier(request: NextRequest, userId: string) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';
  return `ai-dashboard:${userId}:${ip}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(getRequestIdentifier(request, session.user.id));
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'AI request limit exceeded. Please wait before trying again.' },
        { status: 429 },
      );
    }

    const parsedRequest = dashboardAssistantRequestSchema.parse(await request.json());
    const prompt = buildDashboardAssistantPrompt(parsedRequest);
    let brief = buildHeuristicDashboardAssistantBrief(parsedRequest);
    let source: 'tokenrouter-ai' | 'rules' = 'rules';
    let model = 'deterministic-ops-fallback';
    let status = 'FALLBACK';

    if (!(await isTokenRouterConfigured())) {
      const aiLog = await createAiInteractionLog({
        feature: 'dashboard-ops-brief',
        entityType: 'DASHBOARD',
        actorUserId: session.user.id,
        provider: 'rules',
        model,
        prompt,
        response: brief,
        requestPayload: parsedRequest,
        responsePayload: {
          brief,
          mode: parsedRequest.mode,
          source,
          model,
        },
        status,
      });

      return NextResponse.json({
        brief,
        mode: parsedRequest.mode,
        source,
        model,
        generatedAt: new Date().toISOString(),
        aiInteractionLogId: aiLog.id,
      });
    }

    try {
      const completion = await createTokenRouterChatCompletion(
        [
          {
            role: 'system',
            content:
              'You summarize shipping operations for internal staff. Be concise, factual, and operationally useful.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        {
          maxTokens: 520,
          temperature: 0.2,
        },
      );
      brief = completion.content;
      source = 'tokenrouter-ai';
      model = completion.model;
      status = 'SUCCESS';
    } catch {
      // Fallback already prepared.
    }

    const aiLog = await createAiInteractionLog({
      feature: 'dashboard-ops-brief',
      entityType: 'DASHBOARD',
      actorUserId: session.user.id,
      provider: source === 'tokenrouter-ai' ? 'tokenrouter-ai' : 'rules',
      model,
      prompt,
      response: brief,
      requestPayload: parsedRequest,
      responsePayload: {
        brief,
        mode: parsedRequest.mode,
        source,
        model,
        remainingRequests: rateLimit.remaining,
      },
      status,
    });

    return NextResponse.json({
      brief,
      mode: parsedRequest.mode,
      source,
      model,
      generatedAt: new Date().toISOString(),
      remainingRequests: rateLimit.remaining,
      aiInteractionLogId: aiLog.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid dashboard assistant request.', details: error.issues },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : 'Failed to generate dashboard brief.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
