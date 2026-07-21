-- Make barcode nullable on products
ALTER TABLE "products" ALTER COLUMN "barcode" DROP NOT NULL;
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_barcode_key";
ALTER TABLE "products" ADD CONSTRAINT "products_barcode_key" UNIQUE ("barcode");

-- CreateTable: product_barcodes
CREATE TABLE "product_barcodes" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EAN13',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_barcodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: product_packages
CREATE TABLE "product_packages" (
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

-- CreateTable: product_location_stocks
CREATE TABLE "product_location_stocks" (
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

-- CreateIndex
CREATE UNIQUE INDEX "product_barcodes_value_key" ON "product_barcodes"("value");
CREATE INDEX "product_barcodes_product_id_idx" ON "product_barcodes"("product_id");
CREATE UNIQUE INDEX "product_packages_product_id_code_key" ON "product_packages"("product_id", "code");
CREATE UNIQUE INDEX "product_location_stocks_product_id_position_id_key" ON "product_location_stocks"("product_id", "position_id");
CREATE INDEX "product_location_stocks_position_id_idx" ON "product_location_stocks"("position_id");

-- AddForeignKey
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_packages" ADD CONSTRAINT "product_packages_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_packages" ADD CONSTRAINT "product_packages_barcode_id_fkey" FOREIGN KEY ("barcode_id") REFERENCES "product_barcodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "product_location_stocks" ADD CONSTRAINT "product_location_stocks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_location_stocks" ADD CONSTRAINT "product_location_stocks_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "storage_positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
