/*
  Warnings:

  - Changed the type of `avatar_type` on the `avatar` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AvatarType" AS ENUM ('default', 'predefined', 'upload');

-- AlterTable
ALTER TABLE "avatar" DROP COLUMN "avatar_type",
ADD COLUMN     "avatar_type" "AvatarType" NOT NULL;
