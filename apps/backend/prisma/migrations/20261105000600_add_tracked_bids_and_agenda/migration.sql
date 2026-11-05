-- CreateTable
CREATE TABLE IF NOT EXISTS "TrackedBid" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bidControlId" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'analise',
    "nickname" TEXT,
    "customStatus" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT NOT NULL DEFAULT '',
    "bidSnapshot" JSONB NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "items" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackedBid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AgendaReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackedBidId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'lembrete',
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgendaReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrackedBid_userId_stage_idx" ON "TrackedBid"("userId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TrackedBid_userId_bidControlId_key" ON "TrackedBid"("userId", "bidControlId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AgendaReminder_userId_dueAt_idx" ON "AgendaReminder"("userId", "dueAt");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TrackedBid_userId_fkey'
    ) THEN
        ALTER TABLE "TrackedBid"
            ADD CONSTRAINT "TrackedBid_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AgendaReminder_userId_fkey'
    ) THEN
        ALTER TABLE "AgendaReminder"
            ADD CONSTRAINT "AgendaReminder_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AgendaReminder_trackedBidId_fkey'
    ) THEN
        ALTER TABLE "AgendaReminder"
            ADD CONSTRAINT "AgendaReminder_trackedBidId_fkey"
            FOREIGN KEY ("trackedBidId") REFERENCES "TrackedBid"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
