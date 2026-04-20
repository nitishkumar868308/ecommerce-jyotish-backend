-- Add `slug` to Tag with a backfill so the migration is safe on non-empty tables.
-- Step 1: add the column as nullable.
ALTER TABLE "Tag" ADD COLUMN "slug" TEXT;

-- Step 2: backfill existing rows from the tag name. Two-phase lowercase +
-- whitespace→hyphen + strip anything non-alphanumeric. Append the id so
-- duplicates (e.g. two tags called "New Arrival") remain unique.
UPDATE "Tag"
SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'))
           || '-' || "id"::text
WHERE "slug" IS NULL;

-- Step 3: enforce NOT NULL + UNIQUE.
ALTER TABLE "Tag" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");
