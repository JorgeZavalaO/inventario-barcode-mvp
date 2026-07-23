-- Simplify position codes: remove warehouse/floor prefix and C/N column/stack prefix
-- New format: {rackCode}-{compartmentCode}-{depthCode}-{colPad}-{stackPad}
-- Old format: {warehouseCode}-{floorCode}-{rackCode}-{compartmentCode}-{depthCode}-C{col}-N{stack}

-- Drop the global unique constraint on code (replaced by composite unique with rack_id)
ALTER TABLE "storage_positions" DROP CONSTRAINT IF EXISTS "storage_positions_code_key";
DROP INDEX IF EXISTS "storage_positions_code_key";

-- Add composite unique constraint on [rack_id, code]
CREATE UNIQUE INDEX IF NOT EXISTS "storage_positions_rack_id_code_key" ON "storage_positions"("rack_id", "code");
