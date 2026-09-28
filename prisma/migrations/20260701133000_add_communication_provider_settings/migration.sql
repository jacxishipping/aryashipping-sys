CREATE TABLE "CommunicationProviderSettings" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'default',
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailProvider" TEXT NOT NULL DEFAULT 'resend',
    "emailApiKey" TEXT,
    "emailFromAddress" TEXT,
    "emailReplyToAddress" TEXT,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsProvider" TEXT NOT NULL DEFAULT 'twilio',
    "smsAccountSid" TEXT,
    "smsAuthToken" TEXT,
    "smsFromNumber" TEXT,
    "smsMessagingServiceSid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationProviderSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunicationProviderSettings_scope_key" ON "CommunicationProviderSettings"("scope");
