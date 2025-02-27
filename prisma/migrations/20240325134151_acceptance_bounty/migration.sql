/*
  Warnings:

  - You are about to drop the column `acceptedAnswerId` on the `question` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[accepted_answer_id]` on the table `question` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "question" DROP CONSTRAINT "question_acceptedAnswerId_fkey";

-- DropIndex
DROP INDEX "question_acceptedAnswerId_key";

-- AlterTable
ALTER TABLE "question" DROP COLUMN "acceptedAnswerId",
ADD COLUMN     "accepted_answer_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "question_accepted_answer_id_key" ON "question"("accepted_answer_id");

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_accepted_answer_id_fkey" FOREIGN KEY ("accepted_answer_id") REFERENCES "answer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
