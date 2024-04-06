/*
  Warnings:

  - A unique constraint covering the columns `[acceptedAnswerId]` on the table `question` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "question" ADD COLUMN     "acceptedAnswerId" INTEGER,
ADD COLUMN     "bounty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bounty_start_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "question_acceptedAnswerId_key" ON "question"("acceptedAnswerId");

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_acceptedAnswerId_fkey" FOREIGN KEY ("acceptedAnswerId") REFERENCES "answer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
