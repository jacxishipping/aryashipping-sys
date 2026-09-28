CREATE TABLE "AiProviderSettings" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "provider" TEXT NOT NULL DEFAULT 'tokenrouter-ai',
    "apiKey" TEXT,
    "chatCompletionsUrl" TEXT,
    "modelsUrl" TEXT,
    "model" TEXT,
    "maxTokens" INTEGER NOT NULL DEFAULT 500,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProviderSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiProviderSettings_scope_key" ON "AiProviderSettings"("scope");
