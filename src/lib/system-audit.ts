import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

type SystemAuditInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  actorUserId?: string | null;
  summary: string;
  metadata?: Prisma.InputJsonValue;
};

export async function createSystemAuditLog(input: SystemAuditInput) {
  return prisma.aiInteractionLog.create({
    data: {
      feature: `audit:${input.action}`,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      actorUserId: input.actorUserId ?? null,
      provider: 'system-audit',
      model: null,
      prompt: input.summary,
      response: input.summary,
      requestPayload: input.metadata ?? Prisma.JsonNull,
      responsePayload: input.metadata ?? Prisma.JsonNull,
      status: 'SUCCESS',
    },
  });
}

export function redactSecretAuditFields(values: Record<string, unknown>, secretKeys: Set<string>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      secretKeys.has(key) && value ? '[redacted]' : value,
    ]),
  );
}
