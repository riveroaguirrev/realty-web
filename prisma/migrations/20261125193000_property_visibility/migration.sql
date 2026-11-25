ALTER TABLE "Property" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'PUBLIC';
CREATE INDEX "Property_visibility_organizationId_idx" ON "Property"("visibility", "organizationId");
ALTER TABLE "Property" ADD CONSTRAINT "Property_visibility_check" CHECK ("visibility" IN ('PUBLIC', 'ORGANIZATION'));
