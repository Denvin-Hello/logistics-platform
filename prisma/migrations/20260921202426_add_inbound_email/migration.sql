-- CreateTable
CREATE TABLE "InboundEmail" (
    "id" TEXT NOT NULL,
    "resendId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT,
    "text" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "supportTicketId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboundEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InboundEmail_resendId_key" ON "InboundEmail"("resendId");

-- CreateIndex
CREATE INDEX "InboundEmail_from_idx" ON "InboundEmail"("from");

-- CreateIndex
CREATE INDEX "InboundEmail_processed_idx" ON "InboundEmail"("processed");

-- AddForeignKey
ALTER TABLE "InboundEmail" ADD CONSTRAINT "InboundEmail_supportTicketId_fkey" FOREIGN KEY ("supportTicketId") REFERENCES "SupportTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
