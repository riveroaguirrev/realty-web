CREATE TABLE "PropertyImage" (
  "id" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "uploadedBy" TEXT NOT NULL,
  "propertyId" TEXT,
  "removedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PropertyImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PropertyImage_path_key" ON "PropertyImage"("path");
CREATE UNIQUE INDEX "PropertyImage_url_key" ON "PropertyImage"("url");
CREATE INDEX "PropertyImage_propertyId_idx" ON "PropertyImage"("propertyId");
CREATE INDEX "PropertyImage_removedAt_idx" ON "PropertyImage"("removedAt");

ALTER TABLE "PropertyImage" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "PropertyImage" FROM anon, authenticated;
