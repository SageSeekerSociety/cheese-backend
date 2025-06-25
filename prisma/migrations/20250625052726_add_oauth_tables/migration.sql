-- CreateTable
CREATE TABLE "user_o_auth_connection" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "provider_id" TEXT NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "raw_profile" JSONB,
    "refresh_token" TEXT,
    "token_expires" TIMESTAMP(3),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_o_auth_connection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_o_auth_connection_user_id_idx" ON "user_o_auth_connection"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_o_auth_connection_provider_id_provider_user_id_key" ON "user_o_auth_connection"("provider_id", "provider_user_id");

-- AddForeignKey
ALTER TABLE "user_o_auth_connection" ADD CONSTRAINT "user_o_auth_connection_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
