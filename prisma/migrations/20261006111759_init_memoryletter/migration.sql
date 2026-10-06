-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');

-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PageType" AS ENUM ('TEXT', 'MEMORY', 'PHOTO', 'LETTER', 'FINAL');

-- CreateEnum
CREATE TYPE "PageLayout" AS ENUM ('DEFAULT', 'CENTERED', 'SPLIT', 'FULLSCREEN');

-- CreateEnum
CREATE TYPE "PageAlignment" AS ENUM ('LEFT', 'CENTER', 'RIGHT');

-- CreateEnum
CREATE TYPE "TransitionType" AS ENUM ('FADE', 'SLIDE', 'PAGE_TURN', 'BLUR', 'ZOOM');

-- CreateEnum
CREATE TYPE "PhotoLayout" AS ENUM ('FLOATING_BUBBLE', 'POLAROID', 'CIRCLE', 'FULLSCREEN', 'STACKED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'AUDIO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryBook" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "occasion" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "slug" TEXT NOT NULL,
    "coverTitle" TEXT NOT NULL,
    "coverSubtitle" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'UNLISTED',
    "status" "BookStatus" NOT NULL DEFAULT 'DRAFT',
    "themeId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoryBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryPage" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "PageType" NOT NULL DEFAULT 'TEXT',
    "title" TEXT,
    "subtitle" TEXT,
    "body" TEXT,
    "caption" TEXT,
    "mediaId" TEXT,
    "layout" "PageLayout" NOT NULL DEFAULT 'DEFAULT',
    "alignment" "PageAlignment" NOT NULL DEFAULT 'CENTER',
    "transition" "TransitionType" NOT NULL DEFAULT 'PAGE_TURN',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "photoLayout" "PhotoLayout" NOT NULL DEFAULT 'FLOATING_BUBBLE',
    "photoPosition" TEXT,
    "photoSize" INTEGER,
    "photoRotation" DOUBLE PRECISION,
    "photoAnimation" TEXT,
    "photoDelayMs" INTEGER,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoryPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL DEFAULT 'IMAGE',
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "bytes" INTEGER,
    "mimeType" TEXT,
    "alt" TEXT,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "isPreset" BOOLEAN NOT NULL DEFAULT false,
    "background" TEXT NOT NULL,
    "foreground" TEXT NOT NULL,
    "accent" TEXT NOT NULL,
    "card" TEXT NOT NULL,
    "headingFont" TEXT NOT NULL,
    "bodyFont" TEXT NOT NULL,
    "accentFont" TEXT,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Music" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mediaId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "volume" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "loop" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Music_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MemoryBook_slug_key" ON "MemoryBook"("slug");

-- CreateIndex
CREATE INDEX "MemoryBook_ownerId_status_idx" ON "MemoryBook"("ownerId", "status");

-- CreateIndex
CREATE INDEX "MemoryBook_status_visibility_idx" ON "MemoryBook"("status", "visibility");

-- CreateIndex
CREATE INDEX "MemoryBook_themeId_idx" ON "MemoryBook"("themeId");

-- CreateIndex
CREATE INDEX "MemoryPage_mediaId_idx" ON "MemoryPage"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "MemoryPage_bookId_order_key" ON "MemoryPage"("bookId", "order");

-- CreateIndex
CREATE INDEX "Media_bookId_createdAt_idx" ON "Media"("bookId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Media_bookId_publicId_key" ON "Media"("bookId", "publicId");

-- CreateIndex
CREATE INDEX "Theme_isPreset_idx" ON "Theme"("isPreset");

-- CreateIndex
CREATE UNIQUE INDEX "Theme_ownerId_name_key" ON "Theme"("ownerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Music_bookId_key" ON "Music"("bookId");

-- CreateIndex
CREATE INDEX "Music_mediaId_idx" ON "Music"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_token_key" ON "ShareLink"("token");

-- CreateIndex
CREATE INDEX "ShareLink_bookId_active_idx" ON "ShareLink"("bookId", "active");

-- AddForeignKey
ALTER TABLE "MemoryBook" ADD CONSTRAINT "MemoryBook_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryBook" ADD CONSTRAINT "MemoryBook_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryPage" ADD CONSTRAINT "MemoryPage_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "MemoryBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryPage" ADD CONSTRAINT "MemoryPage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "MemoryBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Music" ADD CONSTRAINT "Music_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "MemoryBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Music" ADD CONSTRAINT "Music_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "MemoryBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
