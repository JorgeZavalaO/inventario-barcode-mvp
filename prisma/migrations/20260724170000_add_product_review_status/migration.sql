-- Persist whether each product was marked correct or incorrect during counting.
ALTER TABLE "count_events" ADD COLUMN "is_correct" BOOLEAN NOT NULL DEFAULT true;
