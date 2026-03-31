-- AlterTable
ALTER TABLE "Album" ADD COLUMN     "spotifyId" TEXT;

-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "spotifyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Album_spotifyId_key" ON "Album"("spotifyId");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_spotifyId_key" ON "Artist"("spotifyId");
