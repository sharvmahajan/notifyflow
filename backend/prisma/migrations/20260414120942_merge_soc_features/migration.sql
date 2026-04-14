-- AlterTable
ALTER TABLE "SecurityAlert" ADD COLUMN     "correlatedWith" TEXT[],
ADD COLUMN     "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "forcePasswordReset" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UserBaseline" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "avgLoginsPerHour" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgApiCallsPerHour" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sampleCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IpBaseline" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "avgRequestsPerHour" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sampleCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IpBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedIp" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "blockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "BlockedIp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevokedSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevokedSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Honeytoken" (
    "id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Honeytoken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserBaseline_userId_key" ON "UserBaseline"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "IpBaseline_ip_key" ON "IpBaseline"("ip");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedIp_ip_key" ON "BlockedIp"("ip");

-- CreateIndex
CREATE INDEX "BlockedIp_ip_idx" ON "BlockedIp"("ip");

-- CreateIndex
CREATE UNIQUE INDEX "RevokedSession_tokenHash_key" ON "RevokedSession"("tokenHash");

-- CreateIndex
CREATE INDEX "RevokedSession_tokenHash_idx" ON "RevokedSession"("tokenHash");

-- CreateIndex
CREATE INDEX "RevokedSession_userId_idx" ON "RevokedSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Honeytoken_prefix_key" ON "Honeytoken"("prefix");
