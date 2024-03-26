-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('image', 'file', 'audio', 'video');

-- CreateTable
CREATE TABLE "material" (
    "id" SERIAL NOT NULL,
    "type" "MaterialType" NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "meta" JSON NOT NULL,

    CONSTRAINT "material_pkey" PRIMARY KEY ("id")
);
