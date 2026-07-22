-- Add physical matrix dimensions to rack compartments and storage positions.
ALTER TABLE "rack_compartments"
  ADD COLUMN "column_count" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "stack_levels" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "storage_positions"
  ADD COLUMN "column_index" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "stack_index" INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX "storage_positions_depth_slot_id_column_index_stack_index_key"
  ON "storage_positions"("depth_slot_id", "column_index", "stack_index");
