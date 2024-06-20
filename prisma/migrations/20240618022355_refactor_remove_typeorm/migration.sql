/*
  Warnings:

  - You are about to drop the column `register_request_id` on the `user_register_log` table. All the data in the column will be lost.
  - Changed the type of `type` on the `user_register_log` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `user_reset_password_log` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "UserRegisterLogType" AS ENUM ('RequestSuccess', 'RequestFailDueToAlreadyRegistered', 'RequestFailDueToInvalidOrNotSupportedEmail', 'RequestFailDurToSecurity', 'RequestFailDueToSendEmailFailure', 'Success', 'FailDueToUserExistence', 'FailDueToWrongCodeOrExpired');

-- CreateEnum
CREATE TYPE "UserResetPasswordLogType" AS ENUM ('RequestSuccess', 'RequestFailDueToNoneExistentEmail', 'RequestFailDueToSecurity', 'Success', 'FailDueToInvalidToken', 'FailDueToExpiredRequest', 'FailDueToNoUser');

-- AlterTable
ALTER TABLE "answer_query_log" ALTER COLUMN "user_agent" DROP NOT NULL;

-- AlterTable
ALTER TABLE "attitude" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "comment_query_log" ALTER COLUMN "user_agent" DROP NOT NULL;

-- AlterTable
ALTER TABLE "question_query_log" ALTER COLUMN "user_agent" DROP NOT NULL;

-- AlterTable
ALTER TABLE "question_search_log" ALTER COLUMN "user_agent" DROP NOT NULL;

-- AlterTable
ALTER TABLE "topic_search_log" ALTER COLUMN "user_agent" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user_login_log" ALTER COLUMN "user_agent" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user_profile_query_log" ALTER COLUMN "user_agent" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user_register_log" DROP COLUMN "register_request_id",
DROP COLUMN "type",
ADD COLUMN     "type" "UserRegisterLogType" NOT NULL,
ALTER COLUMN "user_agent" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user_reset_password_log" DROP COLUMN "type",
ADD COLUMN     "type" "UserResetPasswordLogType" NOT NULL,
ALTER COLUMN "user_agent" DROP NOT NULL;
