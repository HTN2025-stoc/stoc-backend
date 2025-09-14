/*
  Warnings:

  - Added the required column `title` to the `feed_posts` table without a default value. This is not possible if the table is not empty.

*/
-- First, add the title column with existing content as default
ALTER TABLE "feed_posts" ADD COLUMN "title" TEXT;

-- Copy existing content to title field
UPDATE "feed_posts" SET "title" = "content";

-- Make title NOT NULL after populating it
ALTER TABLE "feed_posts" ALTER COLUMN "title" SET NOT NULL;

-- Make content nullable (for actual post content)
ALTER TABLE "feed_posts" ALTER COLUMN "content" DROP NOT NULL;
