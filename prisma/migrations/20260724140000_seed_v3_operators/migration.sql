INSERT INTO "operators" ("id", "name")
SELECT source."id", source."name"
FROM (VALUES
  ('6e2e1a0a-0e3b-4d3a-8a01-000000000001', 'EmmaNoelis'),
  ('6e2e1a0a-0e3b-4d3a-8a01-000000000002', 'Rafael'),
  ('6e2e1a0a-0e3b-4d3a-8a01-000000000003', 'Sandra'),
  ('6e2e1a0a-0e3b-4d3a-8a01-000000000004', 'Yuleidy'),
  ('6e2e1a0a-0e3b-4d3a-8a01-000000000005', 'Robert'),
  ('6e2e1a0a-0e3b-4d3a-8a01-000000000006', 'Edwin'),
  ('6e2e1a0a-0e3b-4d3a-8a01-000000000007', 'Yanina'),
  ('6e2e1a0a-0e3b-4d3a-8a01-000000000008', 'Henry'),
  ('6e2e1a0a-0e3b-4d3a-8a01-000000000009', 'Estefanía'),
  ('6e2e1a0a-0e3b-4d3a-8a01-000000000010', 'Eveling'),
  ('6e2e1a0a-0e3b-4d3a-8a01-000000000011', 'Irma'),
  ('6e2e1a0a-0e3b-4d3a-8a01-000000000012', 'Hellen'),
  ('6e2e1a0a-0e3b-4d3a-8a01-000000000013', 'Richard')
) AS source("id", "name")
WHERE NOT EXISTS (
  SELECT 1
  FROM "operators" existing
  WHERE LOWER(existing."name") = LOWER(source."name")
);
