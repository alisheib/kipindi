-- CreateTable
CREATE TABLE "MarketingOptOutToken" (
    "token" TEXT NOT NULL,
    "channel" "MessagingChannel" NOT NULL,
    "identifier" TEXT NOT NULL,
    "category" "MessagingCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingOptOutToken_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE INDEX "MarketingOptOutToken_identifier_idx" ON "MarketingOptOutToken"("identifier");

-- CreateIndex
CREATE INDEX "MarketingOptOutToken_createdAt_idx" ON "MarketingOptOutToken"("createdAt");


