-- CreateEnum
CREATE TYPE "DepthKind" AS ENUM ('FRONT', 'MIDDLE', 'BACK', 'CUSTOM');

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floors" (
    "id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_zones" (
    "id" TEXT NOT NULL,
    "floor_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "order_index" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "racks" (
    "id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "width_mm" INTEGER,
    "height_mm" INTEGER,
    "depth_mm" INTEGER,
    "order_index" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "design" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "racks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rack_compartments" (
    "id" TEXT NOT NULL,
    "rack_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "module_label" TEXT,
    "level_label" TEXT,
    "order_index" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rack_compartments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rack_depth_slots" (
    "id" TEXT NOT NULL,
    "compartment_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "DepthKind" NOT NULL,
    "depth_index" INTEGER NOT NULL,
    "start_z" INTEGER,
    "depth_size" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rack_depth_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_positions" (
    "id" TEXT NOT NULL,
    "rack_id" TEXT NOT NULL,
    "compartment_id" TEXT NOT NULL,
    "depth_slot_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "qr_value" TEXT NOT NULL,
    "capacity_qty" DECIMAL(14,3),
    "capacity_unit" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "countable" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_positions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "floors_warehouse_id_code_key" ON "floors"("warehouse_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_zones_floor_id_code_key" ON "warehouse_zones"("floor_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "racks_zone_id_code_key" ON "racks"("zone_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "rack_compartments_rack_id_code_key" ON "rack_compartments"("rack_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "rack_depth_slots_compartment_id_code_key" ON "rack_depth_slots"("compartment_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "storage_positions_code_key" ON "storage_positions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "storage_positions_qr_value_key" ON "storage_positions"("qr_value");

-- CreateIndex
CREATE INDEX "storage_positions_rack_id_idx" ON "storage_positions"("rack_id");

-- CreateIndex
CREATE INDEX "storage_positions_compartment_id_idx" ON "storage_positions"("compartment_id");

-- CreateIndex
CREATE INDEX "storage_positions_depth_slot_id_idx" ON "storage_positions"("depth_slot_id");

-- AddForeignKey
ALTER TABLE "floors" ADD CONSTRAINT "floors_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_zones" ADD CONSTRAINT "warehouse_zones_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "floors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "racks" ADD CONSTRAINT "racks_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "warehouse_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rack_compartments" ADD CONSTRAINT "rack_compartments_rack_id_fkey" FOREIGN KEY ("rack_id") REFERENCES "racks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rack_depth_slots" ADD CONSTRAINT "rack_depth_slots_compartment_id_fkey" FOREIGN KEY ("compartment_id") REFERENCES "rack_compartments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_positions" ADD CONSTRAINT "storage_positions_rack_id_fkey" FOREIGN KEY ("rack_id") REFERENCES "racks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_positions" ADD CONSTRAINT "storage_positions_compartment_id_fkey" FOREIGN KEY ("compartment_id") REFERENCES "rack_compartments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_positions" ADD CONSTRAINT "storage_positions_depth_slot_id_fkey" FOREIGN KEY ("depth_slot_id") REFERENCES "rack_depth_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
