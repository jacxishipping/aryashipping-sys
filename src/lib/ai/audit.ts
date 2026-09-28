import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

type CreateAiInteractionLogInput = {
  feature: string;
  entityType?: string | null;
  entityId?: string | null;
  actorUserId?: string | null;
  provider: string;
  model?: string | null;
  prompt: string;
  response?: string | null;
  requestPayload?: Prisma.InputJsonValue | null;
  responsePayload?: Prisma.InputJsonValue | null;
  status?: string;
};

export async function createAiInteractionLog(input: CreateAiInteractionLogInput) {
  return prisma.aiInteractionLog.create({
    data: {
      feature: input.feature,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      actorUserId: input.actorUserId ?? null,
      provider: input.provider,
      model: input.model ?? null,
      prompt: input.prompt,
      response: input.response ?? null,
      requestPayload: input.requestPayload ?? Prisma.JsonNull,
      responsePayload: input.responsePayload ?? Prisma.JsonNull,
      status: input.status ?? 'SUCCESS',
    },
  });
}