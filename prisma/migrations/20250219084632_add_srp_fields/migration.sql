-- AlterTable
ALTER TABLE "user" ADD COLUMN     "srp_salt" VARCHAR(500),
ADD COLUMN     "srp_upgraded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "srp_verifier" VARCHAR(1000);
