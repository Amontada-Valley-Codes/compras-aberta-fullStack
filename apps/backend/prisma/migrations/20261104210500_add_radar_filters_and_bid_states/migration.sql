-- CreateTable
CREATE TABLE IF NOT EXISTS "RadarFilter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadarFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RadarBidState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bidControlId" TEXT NOT NULL,
    "isSaved" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadarBidState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RadarFilter_userId_idx" ON "RadarFilter"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RadarBidState_userId_idx" ON "RadarBidState"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RadarBidState_userId_bidControlId_key" ON "RadarBidState"("userId", "bidControlId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'RadarFilter_userId_fkey'
    ) THEN
        ALTER TABLE "RadarFilter"
            ADD CONSTRAINT "RadarFilter_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'RadarBidState_userId_fkey'
    ) THEN
        ALTER TABLE "RadarBidState"
            ADD CONSTRAINT "RadarBidState_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
