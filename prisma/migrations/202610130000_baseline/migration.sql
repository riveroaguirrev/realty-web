-- CreateEnum
CREATE TYPE "OrganizationTier" AS ENUM ('FREE', 'PREMIUM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AdvisorRole" AS ENUM ('AGENT', 'MANAGER', 'DIRECTOR');

-- CreateEnum
CREATE TYPE "AdvisorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'LAND', 'APARTMENT', 'HOUSE', 'OFFICE', 'INDUSTRIAL');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('AVAILABLE', 'UNDER_OFFER', 'SOLD', 'RENT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PropertyCondition" AS ENUM ('NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_REPAIR');

-- CreateEnum
CREATE TYPE "PropertyFurnished" AS ENUM ('UNFURNISHED', 'PARTIALLY_FURNISHED', 'FULLY_FURNISHED', 'DOESNT_MATTER');

-- CreateEnum
CREATE TYPE "PetPolicy" AS ENUM ('ALLOWED', 'NOT_ALLOWED', 'RESTRICTIONS');

-- CreateEnum
CREATE TYPE "RequirementStatus" AS ENUM ('ACTIVE', 'PAUSED', 'FULFILLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SearchTimeline" AS ENUM ('IMMEDIATE', 'WITHIN_3_MONTHS', 'WITHIN_6_MONTHS', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "PropertyFinancing" AS ENUM ('CASH', 'MORTGAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'AS_NEEDED');

-- CreateEnum
CREATE TYPE "NotificationMethod" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SUGGESTED', 'VIEWED', 'CONTACTED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MatchAlgorithm" AS ENUM ('EXACT', 'FUZZY', 'AI');

-- CreateEnum
CREATE TYPE "MatchFeedback" AS ENUM ('NO_RESPONSE', 'INTERESTED', 'NOT_INTERESTED', 'WANT_MORE_INFO', 'SCHEDULED_VIEWING');

-- CreateEnum
CREATE TYPE "ContactedBy" AS ENUM ('ADVISOR', 'BUYER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('EMAIL', 'PHONE', 'WHATSAPP', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('PERCENTAGE', 'FIXED', 'TIERED', 'REVENUE_SHARE');

-- CreateEnum
CREATE TYPE "CommissionAppliesTo" AS ENUM ('ADVISOR', 'ORGANIZATION', 'BOTH');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_MATCH', 'PROPERTY_UPDATED', 'REQUIREMENT_CREATED', 'ADVISOR_REVIEW', 'TRANSACTION_COMPLETED', 'COMMISSION_PAID', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationChannelType" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SALE', 'LEASE', 'RENTAL');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('IN_PROGRESS', 'PENDING_CLOSING', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewVerification" AS ENUM ('UNVERIFIED', 'VERIFIED_BUYER', 'VERIFIED_TRANSACTION');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'GROUP');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logo" TEXT,
    "avatar" TEXT,
    "taxId" TEXT,
    "tier" "OrganizationTier" NOT NULL DEFAULT 'FREE',
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "maxAdvisors" INTEGER NOT NULL DEFAULT 10,
    "maxProperties" INTEGER NOT NULL DEFAULT 100,
    "apiKeyHash" TEXT,
    "webhookUrl" TEXT,
    "bankAccount" JSONB,
    "businessHours" JSONB,
    "socialLinks" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT now() + interval '7 days',
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Advisor" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "profileImage" TEXT,
    "bio" TEXT,
    "organizationId" TEXT,
    "role" "AdvisorRole" NOT NULL DEFAULT 'AGENT',
    "licenseNumber" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "yearsExperience" INTEGER,
    "specializations" TEXT[],
    "language" TEXT[] DEFAULT ARRAY['es']::TEXT[],
    "serviceArea" JSONB,
    "rating" DOUBLE PRECISION DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "totalPropertiesListed" INTEGER NOT NULL DEFAULT 0,
    "totalSalesCommission" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "averageResponseTime" INTEGER,
    "acceptanceRate" DOUBLE PRECISION,
    "commissionRate" DOUBLE PRECISION,
    "bankAccount" JSONB,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "documentUrl" TEXT,
    "status" "AdvisorStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advisor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "type" "PropertyType" NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "condition" "PropertyCondition" NOT NULL DEFAULT 'GOOD',
    "furnished" "PropertyFurnished" NOT NULL DEFAULT 'UNFURNISHED',
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "zipCode" TEXT,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "parking" INTEGER,
    "areaSquareMeters" DOUBLE PRECISION,
    "lotSize" DOUBLE PRECISION,
    "yearBuilt" INTEGER,
    "yearRenovated" INTEGER,
    "hasGarage" BOOLEAN NOT NULL DEFAULT false,
    "hasGarden" BOOLEAN NOT NULL DEFAULT false,
    "hasPool" BOOLEAN NOT NULL DEFAULT false,
    "features" JSONB,
    "amenities" JSONB,
    "appliances" TEXT[],
    "propertyTax" DECIMAL(10,2),
    "hoaFees" DECIMAL(10,2),
    "utilities" JSONB,
    "rentalMonthlyRate" DECIMAL(10,2),
    "rentalFurnished" BOOLEAN,
    "availableDate" TIMESTAMP(3),
    "petPolicy" "PetPolicy" NOT NULL DEFAULT 'NOT_ALLOWED',
    "school" TEXT,
    "distanceToSchool" DOUBLE PRECISION,
    "distanceToTransit" DOUBLE PRECISION,
    "images" TEXT[],
    "videoUrl" TEXT,
    "virtualTourUrl" TEXT,
    "mapUrl" TEXT,
    "documents" JSONB,
    "contact" JSONB,
    "visitNotes" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "favoritesCount" INTEGER NOT NULL DEFAULT 0,
    "priceHistory" JSONB,
    "advisorId" TEXT NOT NULL,
    "organizationId" TEXT,
    "status" "PropertyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "buyerId" TEXT NOT NULL,
    "propertyType" "PropertyType"[],
    "budget" JSONB,
    "financing" "PropertyFinancing" NOT NULL DEFAULT 'MORTGAGE',
    "downPayment" DECIMAL(10,2),
    "priceMin" DECIMAL(12,2),
    "priceMax" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "cities" TEXT[],
    "regions" TEXT[],
    "excludeCities" TEXT[],
    "maxCommute" DOUBLE PRECISION,
    "schoolDistrict" TEXT,
    "commute" JSONB,
    "bedroomsMin" INTEGER,
    "bedroomsMax" INTEGER,
    "bathroomsMin" INTEGER,
    "bathroomsMax" INTEGER,
    "areaMin" DOUBLE PRECISION,
    "areaMax" DOUBLE PRECISION,
    "furnished" "PropertyFurnished" NOT NULL DEFAULT 'DOESNT_MATTER',
    "requiresGarage" BOOLEAN NOT NULL DEFAULT false,
    "requiresGarden" BOOLEAN NOT NULL DEFAULT false,
    "requiresPool" BOOLEAN NOT NULL DEFAULT false,
    "petPolicy" "PetPolicy" NOT NULL DEFAULT 'ALLOWED',
    "preferredAmenities" TEXT[],
    "mustHaveFeatures" TEXT[],
    "dealBreakers" TEXT[],
    "niceToHave" TEXT[],
    "timeline" "SearchTimeline" NOT NULL DEFAULT 'FLEXIBLE',
    "contactFrequency" "ContactFrequency" NOT NULL DEFAULT 'AS_NEEDED',
    "notificationMethod" "NotificationMethod" NOT NULL DEFAULT 'EMAIL',
    "viewedProperties" TEXT[],
    "favoritedProperties" TEXT[],
    "rejectedProperties" TEXT[],
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "responseRate" DOUBLE PRECISION,
    "status" "RequirementStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION,
    "algorithm" "MatchAlgorithm" NOT NULL DEFAULT 'FUZZY',
    "matchBreakdown" JSONB,
    "reasons" TEXT[],
    "mismatches" TEXT[],
    "contactedBy" "ContactedBy" NOT NULL DEFAULT 'SYSTEM',
    "contactedAt" TIMESTAMP(3),
    "notes" TEXT,
    "feedback" "MatchFeedback" NOT NULL DEFAULT 'NO_RESPONSE',
    "communicationChannel" "CommunicationChannel" NOT NULL DEFAULT 'EMAIL',
    "communicationHistory" JSONB,
    "viewedAt" TIMESTAMP(3),
    "viewingDate" TIMESTAMP(3),
    "viewingNotes" TEXT,
    "nextFollowUpDate" TIMESTAMP(3),
    "status" "MatchStatus" NOT NULL DEFAULT 'SUGGESTED',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "closedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionStructure" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "CommissionType" NOT NULL DEFAULT 'PERCENTAGE',
    "basePercentage" DOUBLE PRECISION NOT NULL,
    "bonusPercentage" DOUBLE PRECISION,
    "bonusThreshold" DECIMAL(12,2),
    "tierStructure" JSONB,
    "appliesTo" "CommissionAppliesTo" NOT NULL DEFAULT 'ORGANIZATION',
    "forPropertyType" "PropertyType"[],
    "forCities" TEXT[],
    "minTransactionAmount" DECIMAL(12,2),
    "maxPercentage" DOUBLE PRECISION,
    "status" "CommissionStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "description" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "channel" "NotificationChannelType" NOT NULL DEFAULT 'IN_APP',
    "actionUrl" TEXT,
    "actionLabel" TEXT,
    "relatedEntityId" TEXT,
    "relatedEntityType" TEXT,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "sendAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "type" "ConversationType" NOT NULL DEFAULT 'DIRECT',
    "name" TEXT,
    "description" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "commission" DECIMAL(10,2) NOT NULL,
    "commissionPaid" DECIMAL(10,2),
    "status" "TransactionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "closingDate" TIMESTAMP(3),
    "paymentDate" TIMESTAMP(3),
    "contractUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "propertyId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "verification" "ReviewVerification" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notifyOnNew" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "notes" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_name_key" ON "Organization"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_city_region_idx" ON "Organization"("city", "region");

-- CreateIndex
CREATE INDEX "Organization_status_idx" ON "Organization"("status");

-- CreateIndex
CREATE INDEX "Organization_verified_idx" ON "Organization"("verified");

-- CreateIndex
CREATE UNIQUE INDEX "InviteCode_code_key" ON "InviteCode"("code");

-- CreateIndex
CREATE INDEX "InviteCode_organizationId_idx" ON "InviteCode"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Advisor_email_key" ON "Advisor"("email");

-- CreateIndex
CREATE INDEX "Advisor_organizationId_idx" ON "Advisor"("organizationId");

-- CreateIndex
CREATE INDEX "Advisor_email_idx" ON "Advisor"("email");

-- CreateIndex
CREATE INDEX "Advisor_status_idx" ON "Advisor"("status");

-- CreateIndex
CREATE INDEX "Advisor_rating_idx" ON "Advisor"("rating");

-- CreateIndex
CREATE INDEX "Advisor_createdAt_idx" ON "Advisor"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Property_slug_key" ON "Property"("slug");

-- CreateIndex
CREATE INDEX "Property_advisorId_idx" ON "Property"("advisorId");

-- CreateIndex
CREATE INDEX "Property_organizationId_idx" ON "Property"("organizationId");

-- CreateIndex
CREATE INDEX "Property_status_idx" ON "Property"("status");

-- CreateIndex
CREATE INDEX "Property_type_idx" ON "Property"("type");

-- CreateIndex
CREATE INDEX "Property_city_region_idx" ON "Property"("city", "region");

-- CreateIndex
CREATE INDEX "Property_price_idx" ON "Property"("price");

-- CreateIndex
CREATE INDEX "Property_createdAt_idx" ON "Property"("createdAt");

-- CreateIndex
CREATE INDEX "Property_publishedAt_idx" ON "Property"("publishedAt");

-- CreateIndex
CREATE INDEX "Requirement_buyerId_idx" ON "Requirement"("buyerId");

-- CreateIndex
CREATE INDEX "Requirement_status_idx" ON "Requirement"("status");

-- CreateIndex
CREATE INDEX "Requirement_priority_idx" ON "Requirement"("priority");

-- CreateIndex
CREATE INDEX "Requirement_createdAt_idx" ON "Requirement"("createdAt");

-- CreateIndex
CREATE INDEX "Requirement_expiryDate_idx" ON "Requirement"("expiryDate");

-- CreateIndex
CREATE INDEX "Match_requirementId_idx" ON "Match"("requirementId");

-- CreateIndex
CREATE INDEX "Match_propertyId_idx" ON "Match"("propertyId");

-- CreateIndex
CREATE INDEX "Match_advisorId_idx" ON "Match"("advisorId");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "Match_priority_idx" ON "Match"("priority");

-- CreateIndex
CREATE INDEX "Match_createdAt_idx" ON "Match"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Match_requirementId_propertyId_key" ON "Match"("requirementId", "propertyId");

-- CreateIndex
CREATE INDEX "CommissionStructure_organizationId_idx" ON "CommissionStructure"("organizationId");

-- CreateIndex
CREATE INDEX "CommissionStructure_status_idx" ON "CommissionStructure"("status");

-- CreateIndex
CREATE INDEX "Notification_advisorId_idx" ON "Notification"("advisorId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_priority_idx" ON "Notification"("priority");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_expiresAt_idx" ON "Notification"("expiresAt");

-- CreateIndex
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_createdAt_idx" ON "Conversation"("createdAt");

-- CreateIndex
CREATE INDEX "ConversationParticipant_advisorId_idx" ON "ConversationParticipant"("advisorId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_conversationId_idx" ON "ConversationParticipant"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_advisorId_key" ON "ConversationParticipant"("conversationId", "advisorId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "Transaction_propertyId_idx" ON "Transaction"("propertyId");

-- CreateIndex
CREATE INDEX "Transaction_buyerId_idx" ON "Transaction"("buyerId");

-- CreateIndex
CREATE INDEX "Transaction_advisorId_idx" ON "Transaction"("advisorId");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_organizationId_idx" ON "Transaction"("organizationId");

-- CreateIndex
CREATE INDEX "Review_advisorId_idx" ON "Review"("advisorId");

-- CreateIndex
CREATE INDEX "Review_reviewerId_idx" ON "Review"("reviewerId");

-- CreateIndex
CREATE INDEX "Review_propertyId_idx" ON "Review"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_advisorId_reviewerId_key" ON "Review"("advisorId", "reviewerId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_propertyId_idx" ON "ActivityLog"("propertyId");

-- CreateIndex
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_idx" ON "ActivityLog"("entityType");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "SavedSearch_buyerId_idx" ON "SavedSearch"("buyerId");

-- CreateIndex
CREATE INDEX "SavedSearch_requirementId_idx" ON "SavedSearch"("requirementId");

-- CreateIndex
CREATE INDEX "Favorite_buyerId_idx" ON "Favorite"("buyerId");

-- CreateIndex
CREATE INDEX "Favorite_propertyId_idx" ON "Favorite"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_buyerId_propertyId_key" ON "Favorite"("buyerId", "propertyId");

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advisor" ADD CONSTRAINT "Advisor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "Advisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Advisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "Advisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionStructure" ADD CONSTRAINT "CommissionStructure_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "Advisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "Advisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Advisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Advisor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "Advisor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "Advisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Advisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Advisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Advisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Advisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

