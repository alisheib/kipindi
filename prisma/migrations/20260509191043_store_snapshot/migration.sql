-- CreateTable
CREATE TABLE "StoreSnapshot" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "envelope" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSnapshot_pkey" PRIMARY KEY ("id")
);
