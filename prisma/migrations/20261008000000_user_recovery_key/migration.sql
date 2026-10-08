-- User: optional account-recovery key, stored only as a SHA-256 hash (the key itself is 256 bits of
-- randomness shown once). Additive and nullable, so existing rows and the running app are unaffected.
ALTER TABLE "User" ADD COLUMN "recoveryKeyHash" TEXT;
CREATE UNIQUE INDEX "User_recoveryKeyHash_key" ON "User"("recoveryKeyHash");
