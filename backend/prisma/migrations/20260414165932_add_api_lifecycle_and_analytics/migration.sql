-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DELETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Channel" ADD VALUE 'push';
ALTER TYPE "Channel" ADD VALUE 'webhook';

-- AlterEnum
ALTER TYPE "NotificationStatus" ADD VALUE 'success';

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "ApiAnalytics" (
    "id" TEXT NOT NULL,
    "apiId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalNotifications" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "emailCount" INTEGER NOT NULL DEFAULT 0,
    "smsCount" INTEGER NOT NULL DEFAULT 0,
    "pushCount" INTEGER NOT NULL DEFAULT 0,
    "webhookCount" INTEGER NOT NULL DEFAULT 0,
    "avgLatencyMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApiAnalytics_apiId_date_idx" ON "ApiAnalytics"("apiId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ApiAnalytics_apiId_date_key" ON "ApiAnalytics"("apiId", "date");

-- CreateIndex
CREATE INDEX "ApiKey_status_idx" ON "ApiKey"("status");

-- CreateIndex
CREATE INDEX "Notification_apiKeyId_idx" ON "Notification"("apiKeyId");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE INDEX "Notification_apiKeyId_createdAt_idx" ON "Notification"("apiKeyId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_apiKeyId_status_idx" ON "Notification"("apiKeyId", "status");

-- AddForeignKey
ALTER TABLE "ApiAnalytics" ADD CONSTRAINT "ApiAnalytics_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "ApiKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
