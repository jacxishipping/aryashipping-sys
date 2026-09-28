CREATE TABLE "CallAgentSettings" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'default',
    "twilioAccountSid" TEXT,
    "twilioAuthToken" TEXT,
    "twilioApiKey" TEXT,
    "twilioApiSecret" TEXT,
    "twilioPhoneNumber" TEXT,
    "twilioPhoneNumberSid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallAgentSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CallAgentSettings_scope_key" ON "CallAgentSettings"("scope");