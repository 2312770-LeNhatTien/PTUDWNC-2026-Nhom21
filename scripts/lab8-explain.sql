-- Lab 8: run against the PostgreSQL 16.15 test database after migrations and
-- the 100 Published-recipe seed. Capture the complete output with psql.

-- Full-text search: expected to use IDX_Recipe_SearchVector (GIN).
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT r."Id", r."Title", r."Slug", r."PublishedAt"
FROM "Recipes" AS r
WHERE r."Status" = 1
  AND NOT r."IsDeleted"
  AND r."SearchVector" @@ plainto_tsquery('simple', unaccent('pho bo'))
ORDER BY ts_rank(r."SearchVector", plainto_tsquery('simple', unaccent('pho bo'))) DESC,
         r."Id"
LIMIT 12 OFFSET 0;

-- Public list pagination: expected to use the published/deleted/order indexes
-- (and a stable Id tie-breaker) before LIMIT/OFFSET.
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT r."Id", r."Title", r."Slug", r."PublishedAt"
FROM "Recipes" AS r
WHERE r."Status" = 1
  AND NOT r."IsDeleted"
ORDER BY r."PublishedAt" DESC, r."Id"
LIMIT 12 OFFSET 24;
