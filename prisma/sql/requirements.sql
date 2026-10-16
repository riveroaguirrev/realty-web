-- Additive, idempotent migration. Apply before deploying the requirements feature.
BEGIN;
ALTER TABLE "Requirement" ADD COLUMN IF NOT EXISTS "operation" "PropertyOperation" NOT NULL DEFAULT 'SALE';
ALTER TABLE "Requirement" ADD COLUMN IF NOT EXISTS "zones" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Requirement" ADD COLUMN IF NOT EXISTS "requiresGroundFloor" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Requirement" ADD COLUMN IF NOT EXISTS "petsRequired" BOOLEAN NOT NULL DEFAULT false;
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
COMMIT;
