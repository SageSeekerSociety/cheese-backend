-- AlterTable
ALTER TABLE "user" ADD COLUMN     "last_password_changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
