-- CreateTable
CREATE TABLE "AiInteractionLog" (
    "id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "actorUserId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "prompt" TEXT NOT NULL,
    "response" TEXT,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiInteractionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiInteractionLog_feature_idx" ON "AiInteractionLog"("feature");

-- CreateIndex
CREATE INDEX "AiInteractionLog_entityType_entityId_idx" ON "AiInteractionLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AiInteractionLog_actorUserId_idx" ON "AiInteractionLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AiInteractionLog_createdAt_idx" ON "AiInteractionLog"("createdAt");