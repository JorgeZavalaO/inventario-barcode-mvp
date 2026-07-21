-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SUPERVISOR', 'COUNTER', 'VIEWER');

-- AlterEnum
ALTER TYPE "SessionStatus" ADD VALUE 'DRAFT';
ALTER TYPE "SessionStatus" ADD VALUE 'CANCELLED';

-- AlterTable: add role and active to users
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'COUNTER';
ALTER TABLE "users" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: add schema_version to inventory_sessions
ALTER TABLE "inventory_sessions" ADD COLUMN "schema_version" INTEGER NOT NULL DEFAULT 1;

-- Update existing sessions to schema_version = 1
UPDATE "inventory_sessions" SET "schema_version" = 1 WHERE "schema_version" IS NULL;

-- Set existing OPEN sessions to stay OPEN (since default changed to DRAFT)
UPDATE "inventory_sessions" SET "status" = 'OPEN' WHERE "status" = 'OPEN';
