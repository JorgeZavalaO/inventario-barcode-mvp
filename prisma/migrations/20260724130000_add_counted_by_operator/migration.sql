ALTER TABLE "count_events"
  ADD COLUMN "counted_by_operator_id" TEXT;

ALTER TABLE "box_count_entries"
  ADD COLUMN "counted_by_operator_id" TEXT;

CREATE INDEX "count_events_counted_by_operator_id_idx"
  ON "count_events"("counted_by_operator_id");

CREATE INDEX "box_count_entries_counted_by_operator_id_idx"
  ON "box_count_entries"("counted_by_operator_id");

ALTER TABLE "count_events"
  ADD CONSTRAINT "count_events_counted_by_operator_id_fkey"
  FOREIGN KEY ("counted_by_operator_id") REFERENCES "operators"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "box_count_entries"
  ADD CONSTRAINT "box_count_entries_counted_by_operator_id_fkey"
  FOREIGN KEY ("counted_by_operator_id") REFERENCES "operators"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
