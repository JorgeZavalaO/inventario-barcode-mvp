-- AlterTable
ALTER TABLE "count_events" ADD COLUMN     "box_count_entry_id" TEXT;

-- CreateTable
CREATE TABLE "imports" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pallets" (
    "id" TEXT NOT NULL,
    "import_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boxes" (
    "id" TEXT NOT NULL,
    "pallet_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "expected_position_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "box_products" (
    "id" TEXT NOT NULL,
    "box_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "expected_qty" DECIMAL(14,3),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "box_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "box_count_entries" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "count_round_id" TEXT NOT NULL,
    "box_id" TEXT NOT NULL,
    "position_id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "box_count_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "imports_code_key" ON "imports"("code");

-- CreateIndex
CREATE UNIQUE INDEX "pallets_import_id_number_key" ON "pallets"("import_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "boxes_pallet_id_number_key" ON "boxes"("pallet_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "box_products_box_id_product_id_key" ON "box_products"("box_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "box_count_entries_count_round_id_box_id_key" ON "box_count_entries"("count_round_id", "box_id");

-- CreateIndex
CREATE INDEX "count_events_box_count_entry_id_idx" ON "count_events"("box_count_entry_id");

-- AddForeignKey
ALTER TABLE "pallets" ADD CONSTRAINT "pallets_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boxes" ADD CONSTRAINT "boxes_pallet_id_fkey" FOREIGN KEY ("pallet_id") REFERENCES "pallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boxes" ADD CONSTRAINT "boxes_expected_position_id_fkey" FOREIGN KEY ("expected_position_id") REFERENCES "storage_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "box_products" ADD CONSTRAINT "box_products_box_id_fkey" FOREIGN KEY ("box_id") REFERENCES "boxes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "box_products" ADD CONSTRAINT "box_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "box_count_entries" ADD CONSTRAINT "box_count_entries_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "inventory_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "box_count_entries" ADD CONSTRAINT "box_count_entries_count_round_id_fkey" FOREIGN KEY ("count_round_id") REFERENCES "count_rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "box_count_entries" ADD CONSTRAINT "box_count_entries_box_id_fkey" FOREIGN KEY ("box_id") REFERENCES "boxes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "box_count_entries" ADD CONSTRAINT "box_count_entries_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "storage_positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "box_count_entries" ADD CONSTRAINT "box_count_entries_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "count_events" ADD CONSTRAINT "count_events_box_count_entry_id_fkey" FOREIGN KEY ("box_count_entry_id") REFERENCES "box_count_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

