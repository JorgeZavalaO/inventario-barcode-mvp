-- CreateEnum
CREATE TYPE "PositionStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'RECOUNT_REQUIRED', 'APPROVED', 'EXCLUDED');
CREATE TYPE "CountRoundStatus" AS ENUM ('OPEN', 'SUBMITTED', 'REJECTED', 'APPROVED', 'CANCELLED');

-- AlterTable: add V2 fields to count_events
ALTER TABLE "count_events" ADD COLUMN "position_id" TEXT;
ALTER TABLE "count_events" ADD COLUMN "count_round_id" TEXT;
ALTER TABLE "count_events" ADD COLUMN "package_id" TEXT;
ALTER TABLE "count_events" ADD COLUMN "package_count" DECIMAL(14,3);
ALTER TABLE "count_events" ADD COLUMN "units_per_package" DECIMAL(14,3);
ALTER TABLE "count_events" ADD COLUMN "loose_quantity" DECIMAL(14,3);
ALTER TABLE "count_events" ADD COLUMN "reversed_by_id" TEXT;
ALTER TABLE "count_events" ADD COLUMN "reversal_reason" TEXT;
CREATE INDEX IF NOT EXISTS "count_events_session_id_position_id_product_id_idx" ON "count_events"("session_id", "position_id", "product_id");
CREATE INDEX IF NOT EXISTS "count_events_count_round_id_created_at_idx" ON "count_events"("count_round_id", "created_at");

-- CreateTable: session_positions
CREATE TABLE "session_positions" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "position_id" TEXT NOT NULL,
    "status" "PositionStatus" NOT NULL DEFAULT 'PENDING',
    "assigned_to_id" TEXT,
    "assigned_by_id" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "approved_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "session_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: session_stock_snapshots
CREATE TABLE "session_stock_snapshots" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "position_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "theoretical_stock" DECIMAL(14,3) NOT NULL,
    "source" TEXT,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "session_stock_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable: count_rounds
CREATE TABLE "count_rounds" (
    "id" TEXT NOT NULL,
    "session_position_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "operator_id" TEXT NOT NULL,
    "status" "CountRoundStatus" NOT NULL DEFAULT 'OPEN',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "count_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable: count_incidents
CREATE TABLE "count_incidents" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "position_id" TEXT NOT NULL,
    "reported_by_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_by_id" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "count_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "session_positions_session_id_position_id_key" ON "session_positions"("session_id", "position_id");
CREATE UNIQUE INDEX "session_stock_snapshots_session_id_position_id_product_id_key" ON "session_stock_snapshots"("session_id", "position_id", "product_id");
CREATE UNIQUE INDEX "count_rounds_session_position_id_round_number_key" ON "count_rounds"("session_position_id", "round_number");

-- AddForeignKey
ALTER TABLE "count_events" ADD CONSTRAINT "count_events_count_round_id_fkey" FOREIGN KEY ("count_round_id") REFERENCES "count_rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "session_positions" ADD CONSTRAINT "session_positions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "inventory_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_positions" ADD CONSTRAINT "session_positions_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "storage_positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "session_stock_snapshots" ADD CONSTRAINT "session_stock_snapshots_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "inventory_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_stock_snapshots" ADD CONSTRAINT "session_stock_snapshots_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "storage_positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "session_stock_snapshots" ADD CONSTRAINT "session_stock_snapshots_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "count_rounds" ADD CONSTRAINT "count_rounds_session_position_id_fkey" FOREIGN KEY ("session_position_id") REFERENCES "session_positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "count_incidents" ADD CONSTRAINT "count_incidents_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "inventory_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "count_incidents" ADD CONSTRAINT "count_incidents_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "storage_positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
