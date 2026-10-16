-- Add fields introduced for property discovery and advisor requirements.
-- IF NOT EXISTS also supports local installations that used db push before migrations.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PropertyLocationMode') THEN
    CREATE TYPE "PropertyLocationMode" AS ENUM ('EXACT', 'RADIUS');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PropertyOperation') THEN
    CREATE TYPE "PropertyOperation" AS ENUM ('SALE', 'RENTAL', 'ANTICRETIC');
  END IF;
END $$;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "commissionPercentage" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "expensesIncluded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isExclusive" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "locationMode" "PropertyLocationMode" NOT NULL DEFAULT 'RADIUS',
  ADD COLUMN IF NOT EXISTS "locationRadiusMeters" INTEGER NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS "operation" "PropertyOperation" NOT NULL DEFAULT 'SALE',
  ADD COLUMN IF NOT EXISTS "petsAllowed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "wifiIncluded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Requirement" ADD COLUMN IF NOT EXISTS "operation" "PropertyOperation" NOT NULL DEFAULT 'SALE',
  ADD COLUMN IF NOT EXISTS "petsRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "requiresGroundFloor" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "zones" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE TABLE IF NOT EXISTS "PushSubscription" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "advisorId" TEXT NOT NULL REFERENCES "Advisor"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "PushSubscription_advisorId_idx" ON "PushSubscription"("advisorId");
ALTER TABLE "PushSubscription" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "PushSubscription" FROM anon, authenticated;
