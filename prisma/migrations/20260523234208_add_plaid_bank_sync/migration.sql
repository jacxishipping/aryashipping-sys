-- CreateTable
CREATE TABLE "PlaidItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "accessTokenCiphertext" TEXT NOT NULL,
    "institutionId" TEXT,
    "institutionName" TEXT,
    "lastCursor" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "selectedAccounts" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaidItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaidSyncedTransaction" (
    "id" TEXT NOT NULL,
    "plaidItemId" TEXT NOT NULL,
    "plaidTransactionId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "ledgerEntryId" TEXT,
    "isRemoved" BOOLEAN NOT NULL DEFAULT false,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaidSyncedTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlaidItem_itemId_key" ON "PlaidItem"("itemId");

-- CreateIndex
CREATE INDEX "PlaidItem_userId_idx" ON "PlaidItem"("userId");

-- CreateIndex
CREATE INDEX "PlaidItem_status_idx" ON "PlaidItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PlaidSyncedTransaction_plaidTransactionId_key" ON "PlaidSyncedTransaction"("plaidTransactionId");

-- CreateIndex
CREATE INDEX "PlaidSyncedTransaction_plaidItemId_idx" ON "PlaidSyncedTransaction"("plaidItemId");

-- CreateIndex
CREATE INDEX "PlaidSyncedTransaction_ledgerEntryId_idx" ON "PlaidSyncedTransaction"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "PlaidSyncedTransaction_isRemoved_idx" ON "PlaidSyncedTransaction"("isRemoved");

-- AddForeignKey
ALTER TABLE "PlaidItem" ADD CONSTRAINT "PlaidItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaidSyncedTransaction" ADD CONSTRAINT "PlaidSyncedTransaction_plaidItemId_fkey" FOREIGN KEY ("plaidItemId") REFERENCES "PlaidItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
