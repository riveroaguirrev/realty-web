ALTER TABLE "Requirement" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_visibility_check" CHECK ("visibility" IN ('PUBLIC', 'ORGANIZATION'));
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Requirement_visibility_organizationId_idx" ON "Requirement"("visibility", "organizationId");
