/*
  Warnings:

  - Added the required column `uploader_id` to the `material` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('image', 'video', 'audio', 'file');

-- AlterTable
ALTER TABLE "material" ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "download_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "expires" INTEGER,
ADD COLUMN     "uploader_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "attachment" (
    "id" SERIAL NOT NULL,
    "type" "AttachmentType" NOT NULL,
    "url" TEXT NOT NULL,
    "meta" JSON NOT NULL,

    CONSTRAINT "attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_bundle" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "creator_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "my_rating" DOUBLE PRECISION,
    "comments_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "material_bundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materialbundles_relation" (
    "material_id" INTEGER NOT NULL,
    "bundle_id" INTEGER NOT NULL,

    CONSTRAINT "materialbundles_relation_pkey" PRIMARY KEY ("material_id","bundle_id")
);

-- AddForeignKey
ALTER TABLE "material_bundle" ADD CONSTRAINT "material_bundle_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material" ADD CONSTRAINT "material_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materialbundles_relation" ADD CONSTRAINT "materialbundles_relation_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materialbundles_relation" ADD CONSTRAINT "materialbundles_relation_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "material_bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
