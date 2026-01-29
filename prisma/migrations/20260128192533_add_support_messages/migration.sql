-- CreateEnum
CREATE TYPE "SupportMessageType" AS ENUM ('live_chat', 'contact_form', 'support_ticket', 'inquiry');

-- CreateEnum
CREATE TYPE "SupportMessageCategory" AS ENUM ('general', 'technical', 'billing', 'account', 'vehicle', 'swap', 'part', 'other');

-- CreateEnum
CREATE TYPE "SupportMessageStatus" AS ENUM ('pending', 'in_progress', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "SupportMessagePriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userPhone" TEXT,
    "message" TEXT NOT NULL,
    "type" "SupportMessageType" NOT NULL DEFAULT 'live_chat',
    "category" "SupportMessageCategory" NOT NULL DEFAULT 'general',
    "status" "SupportMessageStatus" NOT NULL DEFAULT 'pending',
    "priority" "SupportMessagePriority" NOT NULL DEFAULT 'medium',
    "assignedToId" TEXT,
    "adminResponse" TEXT,
    "respondedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "attachments" JSONB[],
    "tags" TEXT[],
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "notes" JSONB[],

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportMessage_userId_idx" ON "SupportMessage"("userId");

-- CreateIndex
CREATE INDEX "SupportMessage_userEmail_idx" ON "SupportMessage"("userEmail");

-- CreateIndex
CREATE INDEX "SupportMessage_status_idx" ON "SupportMessage"("status");

-- CreateIndex
CREATE INDEX "SupportMessage_type_idx" ON "SupportMessage"("type");

-- CreateIndex
CREATE INDEX "SupportMessage_category_idx" ON "SupportMessage"("category");

-- CreateIndex
CREATE INDEX "SupportMessage_assignedToId_idx" ON "SupportMessage"("assignedToId");

-- CreateIndex
CREATE INDEX "SupportMessage_priority_idx" ON "SupportMessage"("priority");

-- CreateIndex
CREATE INDEX "SupportMessage_createdAt_idx" ON "SupportMessage"("createdAt");

-- CreateIndex
CREATE INDEX "SupportMessage_status_createdAt_idx" ON "SupportMessage"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
