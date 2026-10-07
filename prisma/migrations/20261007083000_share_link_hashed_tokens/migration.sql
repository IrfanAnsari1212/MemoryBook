-- ShareLink: store only a hash of the share token, replace the boolean `active` with `revokedAt`,
-- add an optional label and updatedAt. The table held no rows when this migration was written, so the
-- column rename (token -> tokenHash) cannot leave any raw token behind.

-- Rename (keeps the unique index and its data)
ALTER TABLE "ShareLink" RENAME COLUMN "token" TO "tokenHash";
ALTER INDEX "ShareLink_token_key" RENAME TO "ShareLink_tokenHash_key";

-- active -> revokedAt
DROP INDEX "ShareLink_bookId_active_idx";
ALTER TABLE "ShareLink" DROP COLUMN "active";
ALTER TABLE "ShareLink"
  ADD COLUMN "revokedAt" TIMESTAMP(3),
  ADD COLUMN "label" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "ShareLink_bookId_revokedAt_idx" ON "ShareLink"("bookId", "revokedAt");
