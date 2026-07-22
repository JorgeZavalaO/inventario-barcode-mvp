-- Repair migration for databases whose v3 migration was recorded but whose
-- product location tables were not actually created.
CREATE TABLE IF NOT EXISTS "product_barcodes" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EAN13',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_barcodes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "product_packages" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_quantity" DECIMAL(14,3) NOT NULL,
    "barcode_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_packages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "product_location_stocks" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "position_id" TEXT NOT NULL,
    "theoretical_stock" DECIMAL(14,3) NOT NULL,
    "minimum_stock" DECIMAL(14,3),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "source_updated_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_location_stocks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_barcodes_value_key" ON "product_barcodes"("value");
CREATE INDEX IF NOT EXISTS "product_barcodes_product_id_idx" ON "product_barcodes"("product_id");
CREATE UNIQUE INDEX IF NOT EXISTS "product_packages_product_id_code_key" ON "product_packages"("product_id", "code");
CREATE INDEX IF NOT EXISTS "product_location_stocks_position_id_idx" ON "product_location_stocks"("position_id");
CREATE UNIQUE INDEX IF NOT EXISTS "product_location_stocks_product_id_position_id_key" ON "product_location_stocks"("product_id", "position_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_barcodes_product_id_fkey') THEN
    ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_packages_product_id_fkey') THEN
    ALTER TABLE "product_packages" ADD CONSTRAINT "product_packages_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_packages_barcode_id_fkey') THEN
    ALTER TABLE "product_packages" ADD CONSTRAINT "product_packages_barcode_id_fkey"
      FOREIGN KEY ("barcode_id") REFERENCES "product_barcodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_location_stocks_product_id_fkey') THEN
    ALTER TABLE "product_location_stocks" ADD CONSTRAINT "product_location_stocks_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_location_stocks_position_id_fkey') THEN
    ALTER TABLE "product_location_stocks" ADD CONSTRAINT "product_location_stocks_position_id_fkey"
      FOREIGN KEY ("position_id") REFERENCES "storage_positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
