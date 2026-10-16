-- Additive migration. Existing roles and members are preserved.
CREATE TYPE "UserRole" AS ENUM ('ADVISOR', 'BUYER');
ALTER TABLE "Advisor"
  ADD COLUMN "userRole" "UserRole" NOT NULL DEFAULT 'ADVISOR',
  ADD COLUMN "activeSessionId" UUID,
  ADD COLUMN "authorizedBrowserHash" TEXT,
  ADD COLUMN "credentialsVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "InviteCode" ADD COLUMN "usedById" TEXT, ADD COLUMN "cancelledAt" TIMESTAMP(3);
CREATE TABLE "AccountSession" (
  "id" UUID PRIMARY KEY,
  "advisorId" TEXT NOT NULL REFERENCES "Advisor"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "browserHash" TEXT NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AccountSession_advisorId_revokedAt_idx" ON "AccountSession"("advisorId", "revokedAt");
CREATE TABLE "AuthChallenge" (
  "id" UUID PRIMARY KEY, "userId" TEXT NOT NULL, "purpose" TEXT NOT NULL,
  "email" TEXT NOT NULL, "newEmail" TEXT, "browserHash" TEXT NOT NULL,
  "sessionId" UUID, "credentialsVersion" INTEGER NOT NULL DEFAULT 0, "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AuthChallenge_userId_purpose_idx" ON "AuthChallenge"("userId", "purpose");
CREATE TABLE "AuthRateLimit" (
  "key" TEXT PRIMARY KEY, "hits" INTEGER NOT NULL, "resetAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "AuthRateLimit_resetAt_idx" ON "AuthRateLimit"("resetAt");
-- These tables are exclusively maintained by the server.
ALTER TABLE "AccountSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuthChallenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuthRateLimit" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "AccountSession", "AuthChallenge", "AuthRateLimit" FROM anon, authenticated;
