/*
  Warnings:
  - You are about to drop the `answer_user_attitude` table. If the table is not empty, all the data it contains will be lost.
*/
-- DropForeignKey
ALTER TABLE "answer_user_attitude" DROP CONSTRAINT "FK_2de5146dd65213f724e32745d06";

-- DropForeignKey
ALTER TABLE "answer_user_attitude" DROP CONSTRAINT "FK_7555fb52fdf623d67f9884ea63d";

-- DropTable
DROP TABLE "answer_user_attitude";
