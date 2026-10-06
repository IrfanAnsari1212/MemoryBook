-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "format" TEXT,
ADD COLUMN     "originalFilename" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
