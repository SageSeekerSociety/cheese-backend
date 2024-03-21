-- CreateEnum
CREATE TYPE "attitudable_type" AS ENUM ('COMMENT', 'QUESTION', 'ANSWER');

-- CreateEnum
CREATE TYPE "attitude_type" AS ENUM ('UNDEFINED', 'POSITIVE', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "attitude_type_not_undefined" AS ENUM ('POSITIVE', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "comment_commentabletype_enum" AS ENUM ('ANSWER', 'COMMENT', 'QUESTION');

-- CreateTable
CREATE TABLE "answer" (
    "id" SERIAL NOT NULL,
    "createdById" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "groupId" INTEGER,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "PK_9232db17b63fb1e94f97e5c224f" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_delete_log" (
    "id" SERIAL NOT NULL,
    "deleterId" INTEGER,
    "answerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_f1696d27f69ec9c6133a12aadcf" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_favorited_by_user" (
    "answerId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "PK_5a857fe93c44fdb538ec5aa4771" PRIMARY KEY ("answerId","userId")
);

-- CreateTable
CREATE TABLE "answer_query_log" (
    "id" SERIAL NOT NULL,
    "viewerId" INTEGER,
    "answerId" INTEGER NOT NULL,
    "ip" VARCHAR NOT NULL,
    "userAgent" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_4f65c4804d0693f458a716aa72c" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_update_log" (
    "id" SERIAL NOT NULL,
    "updaterId" INTEGER,
    "answerId" INTEGER NOT NULL,
    "oldContent" TEXT NOT NULL,
    "newContent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_5ae381609b7ae9f2319fe26031f" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_user_attitude" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "answerId" INTEGER NOT NULL,
    "type" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PK_c06b4ffc5a74d07cb867d6b3f98" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attitude" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "attitudableType" "attitudable_type" NOT NULL,
    "attitudableId" INTEGER NOT NULL,
    "attitude" "attitude_type_not_undefined" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attitude_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attitude_log" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "attitudableType" "attitudable_type" NOT NULL,
    "attitudableId" INTEGER NOT NULL,
    "attitude" "attitude_type" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attitude_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" SERIAL NOT NULL,
    "validUntil" TIMESTAMP(6) NOT NULL,
    "revoked" BOOLEAN NOT NULL,
    "userId" INTEGER NOT NULL,
    "authorization" TEXT NOT NULL,
    "lastRefreshedAt" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_f55da76ac1c3ac420f444d2ff11" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_refresh_log" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "oldRefreshToken" TEXT NOT NULL,
    "newRefreshToken" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_f8f46c039b0955a7df6ad6631d7" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avatar" (
    "id" SERIAL NOT NULL,
    "url" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avatarType" VARCHAR NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "avatar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment" (
    "id" SERIAL NOT NULL,
    "commentableType" "comment_commentabletype_enum" NOT NULL,
    "commentableId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "PK_0b0e4bbc8415ec426f87f3a88e2" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_delete_log" (
    "id" SERIAL NOT NULL,
    "commentId" INTEGER NOT NULL,
    "operatedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_429889b4bdc646cb80ef8bc1814" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_query_log" (
    "id" SERIAL NOT NULL,
    "commentId" INTEGER NOT NULL,
    "viewerId" INTEGER,
    "ip" VARCHAR NOT NULL,
    "userAgent" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_afbfb3d92cbf55c99cb6bdcd58f" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT ('now'::text)::timestamp(3) with time zone,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "PK_256aa0fda9b1de1a73ee0b7106b" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_membership" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "role" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "PK_b631623cf04fa74513b975e7059" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_profile" (
    "id" SERIAL NOT NULL,
    "intro" VARCHAR NOT NULL,
    "avatarId" INTEGER,
    "groupId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "PK_2a62b59d1bf8a3191c992e8daf4" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_question_relationship" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "PK_47ee7be0b0f0e51727012382922" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_target" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "name" VARCHAR NOT NULL,
    "intro" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),
    "startedAt" DATE NOT NULL,
    "endedAt" DATE NOT NULL,
    "attendanceFrequency" VARCHAR NOT NULL,

    CONSTRAINT "PK_f1671a42b347bd96ce6595f91ee" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_elasticsearch_relation" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "elasticsearchId" TEXT NOT NULL,

    CONSTRAINT "question_elasticsearch_relation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_invitation_relation" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_invitation_relation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question" (
    "id" SERIAL NOT NULL,
    "createdById" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "groupId" INTEGER,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "PK_21e5786aa0ea704ae185a79b2d5" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_follower_relation" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "followerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "PK_5f5ce2e314f975612a13d601362" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_query_log" (
    "id" SERIAL NOT NULL,
    "viewerId" INTEGER,
    "questionId" INTEGER NOT NULL,
    "ip" VARCHAR NOT NULL,
    "userAgent" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_2876061262a774e4aba4daaaae4" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_search_log" (
    "id" SERIAL NOT NULL,
    "keywords" VARCHAR NOT NULL,
    "firstQuestionId" INTEGER,
    "pageSize" INTEGER NOT NULL,
    "result" VARCHAR NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "searcherId" INTEGER,
    "ip" VARCHAR NOT NULL,
    "userAgent" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_6f41b41474cf92c67a7da97384c" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_topic_relation" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "topicId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "PK_c50ec8a9ac6c3007f0861e4a383" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "PK_33aa4ecb4e4f20aa0157ea7ef61" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_search_log" (
    "id" SERIAL NOT NULL,
    "keywords" VARCHAR NOT NULL,
    "firstTopicId" INTEGER,
    "pageSize" INTEGER NOT NULL,
    "result" VARCHAR NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "searcherId" INTEGER,
    "ip" VARCHAR NOT NULL,
    "userAgent" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_41a432f5f993017b2502c73c78e" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR NOT NULL,
    "hashedPassword" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_following_relationship" (
    "id" SERIAL NOT NULL,
    "followeeId" INTEGER NOT NULL,
    "followerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "PK_3b0199015f8814633fc710ff09d" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_login_log" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "ip" VARCHAR NOT NULL,
    "userAgent" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_f8db79b1af1f385db4f45a2222e" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "nickname" VARCHAR NOT NULL,
    "avatarId" INTEGER NOT NULL,
    "intro" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "PK_f44d0cd18cfd80b0fed7806c3b7" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profile_query_log" (
    "id" SERIAL NOT NULL,
    "viewerId" INTEGER,
    "vieweeId" INTEGER NOT NULL,
    "ip" VARCHAR NOT NULL,
    "userAgent" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_9aeff7c959703fad866e9ad581a" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_register_log" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR NOT NULL,
    "type" INTEGER NOT NULL,
    "registerRequestId" INTEGER,
    "ip" VARCHAR NOT NULL,
    "userAgent" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_3596a6f74bd2a80be930f6d1e39" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_register_request" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR NOT NULL,
    "code" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_cdf2d880551e43d9362ddd37ae0" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_reset_password_log" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "type" INTEGER NOT NULL,
    "ip" VARCHAR NOT NULL,
    "userAgent" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_3ee4f25e7f4f1d5a9bd9817b62b" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IDX_1887685ce6667b435b01c646a2" ON "answer"("groupId");

-- CreateIndex
CREATE INDEX "IDX_a4013f10cd6924793fbd5f0d63" ON "answer"("questionId");

-- CreateIndex
CREATE INDEX "IDX_f636f6e852686173ea947f2904" ON "answer"("createdById");

-- CreateIndex
CREATE INDEX "IDX_910393b814aac627593588c17f" ON "answer_delete_log"("answerId");

-- CreateIndex
CREATE INDEX "IDX_c2d0251df4669e17a57d6dbc06" ON "answer_delete_log"("deleterId");

-- CreateIndex
CREATE INDEX "IDX_9556368d270d73579a68db7e1b" ON "answer_favorited_by_user"("userId");

-- CreateIndex
CREATE INDEX "IDX_c27a91d761c26ad612a0a35697" ON "answer_favorited_by_user"("answerId");

-- CreateIndex
CREATE INDEX "IDX_71ed57d6bb340716f5e17043bb" ON "answer_query_log"("answerId");

-- CreateIndex
CREATE INDEX "IDX_f4b7cd859700f8928695b6c2ba" ON "answer_query_log"("viewerId");

-- CreateIndex
CREATE INDEX "IDX_0ef2a982b61980d95b5ae7f1a6" ON "answer_update_log"("updaterId");

-- CreateIndex
CREATE INDEX "IDX_6f0964cf74c12678a86e49b23f" ON "answer_update_log"("answerId");

-- CreateIndex
CREATE INDEX "attitude_userId_idx" ON "attitude"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "attitude_attitudableId_userId_attitudableType_key" ON "attitude"("attitudableId", "userId", "attitudableType");

-- CreateIndex
CREATE INDEX "attitude_log_attitudableId_attitudableType_idx" ON "attitude_log"("attitudableId", "attitudableType");

-- CreateIndex
CREATE INDEX "attitude_log_userId_idx" ON "attitude_log"("userId");

-- CreateIndex
CREATE INDEX "IDX_3d2f174ef04fb312fdebd0ddc5" ON "session"("userId");

-- CreateIndex
CREATE INDEX "IDX_bb46e87d5b3f1e55c625755c00" ON "session"("validUntil");

-- CreateIndex
CREATE INDEX "IDX_525212ea7a75cba69724e42303" ON "comment"("commentableId");

-- CreateIndex
CREATE INDEX "IDX_63ac916757350d28f05c5a6a4b" ON "comment"("createdById");

-- CreateIndex
CREATE INDEX "IDX_53f0a8befcc12c0f7f2bab7584" ON "comment_delete_log"("operatedById");

-- CreateIndex
CREATE INDEX "IDX_66705ce7d7908554cff01b260e" ON "comment_delete_log"("commentId");

-- CreateIndex
CREATE INDEX "IDX_4020ff7fcffb2737e990f8bde5" ON "comment_query_log"("commentId");

-- CreateIndex
CREATE INDEX "IDX_4ead8566a6fa987264484b13d5" ON "comment_query_log"("viewerId");

-- CreateIndex
CREATE UNIQUE INDEX "IDX_8a45300fd825918f3b40195fbd" ON "group"("name");

-- CreateIndex
CREATE INDEX "IDX_7d88d00d8617a802b698c0cd60" ON "group_membership"("memberId");

-- CreateIndex
CREATE INDEX "IDX_b1411f07fafcd5ad93c6ee1642" ON "group_membership"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "REL_7359ba99cc116d00cf74e048ed" ON "group_profile"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "REL_5b1232271bf29d99456fcf39e7" ON "group_question_relationship"("questionId");

-- CreateIndex
CREATE INDEX "IDX_b31bf3b3688ec41daaced89a0a" ON "group_question_relationship"("groupId");

-- CreateIndex
CREATE INDEX "IDX_19d57f140124c5100e8e1ca308" ON "group_target"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "question_elasticsearch_relation_questionId_key" ON "question_elasticsearch_relation"("questionId");

-- CreateIndex
CREATE INDEX "question_invitation_relation_questionId_idx" ON "question_invitation_relation"("questionId");

-- CreateIndex
CREATE INDEX "question_invitation_relation_userId_idx" ON "question_invitation_relation"("userId");

-- CreateIndex
CREATE INDEX "IDX_187915d8eaa010cde8b053b35d" ON "question"("createdById");

-- CreateIndex
CREATE INDEX "IDX_8b24620899a8556c3f22f52145" ON "question"("title", "content");

-- CreateIndex
CREATE INDEX "IDX_ac7c68d428ab7ffd2f4752eeaa" ON "question"("groupId");

-- CreateIndex
CREATE INDEX "IDX_21a30245c4a32d5ac67da80901" ON "question_follower_relation"("followerId");

-- CreateIndex
CREATE INDEX "IDX_6544f7f7579bf88e3c62f995f8" ON "question_follower_relation"("questionId");

-- CreateIndex
CREATE INDEX "IDX_8ce4bcc67caf0406e6f20923d4" ON "question_query_log"("viewerId");

-- CreateIndex
CREATE INDEX "IDX_a0ee1672e103ed0a0266f217a3" ON "question_query_log"("questionId");

-- CreateIndex
CREATE INDEX "IDX_13c7e9fd7403cc5a87ab6524bc" ON "question_search_log"("searcherId");

-- CreateIndex
CREATE INDEX "IDX_2fbe3aa9f62233381aefeafa00" ON "question_search_log"("keywords");

-- CreateIndex
CREATE INDEX "IDX_dd4b9a1b83559fa38a3a50463f" ON "question_topic_relation"("topicId");

-- CreateIndex
CREATE INDEX "IDX_fab99c5e4fc380d9b7f9abbbb0" ON "question_topic_relation"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "idx_topic_name_unique" ON "topic"("name");

-- CreateIndex
CREATE INDEX "IDX_59d7548ea797208240417106e2" ON "topic"("createdById");

-- CreateIndex
CREATE INDEX "idx_topic_name_ft" ON "topic"("name");

-- CreateIndex
CREATE INDEX "IDX_85c1844b4fa3e29b1b8dfaeac6" ON "topic_search_log"("keywords");

-- CreateIndex
CREATE INDEX "IDX_fe1e75b8b625499f0119faaba5" ON "topic_search_log"("searcherId");

-- CreateIndex
CREATE UNIQUE INDEX "IDX_78a916df40e02a9deb1c4b75ed" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "IDX_e12875dfb3b1d92d7d7c5377e2" ON "user"("email");

-- CreateIndex
CREATE INDEX "IDX_868df0c2c3a138ee54d2a515bc" ON "user_following_relationship"("followerId");

-- CreateIndex
CREATE INDEX "IDX_c78831eeee179237b1482d0c6f" ON "user_following_relationship"("followeeId");

-- CreateIndex
CREATE INDEX "IDX_66c592c7f7f20d1214aba2d004" ON "user_login_log"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "IDX_51cb79b5555effaf7d69ba1cff" ON "user_profile"("userId");

-- CreateIndex
CREATE INDEX "IDX_1261db28434fde159acda6094b" ON "user_profile_query_log"("viewerId");

-- CreateIndex
CREATE INDEX "IDX_ff592e4403b328be0de4f2b397" ON "user_profile_query_log"("vieweeId");

-- CreateIndex
CREATE INDEX "IDX_3af79f07534d9f1c945cd4c702" ON "user_register_log"("email");

-- CreateIndex
CREATE INDEX "IDX_c1d0ecc369d7a6a3d7e876c589" ON "user_register_request"("email");

-- AddForeignKey
ALTER TABLE "answer" ADD CONSTRAINT "FK_1887685ce6667b435b01c646a2c" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer" ADD CONSTRAINT "FK_a4013f10cd6924793fbd5f0d637" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer" ADD CONSTRAINT "FK_f636f6e852686173ea947f29045" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer_delete_log" ADD CONSTRAINT "FK_910393b814aac627593588c17fd" FOREIGN KEY ("answerId") REFERENCES "answer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer_delete_log" ADD CONSTRAINT "FK_c2d0251df4669e17a57d6dbc06f" FOREIGN KEY ("deleterId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer_favorited_by_user" ADD CONSTRAINT "FK_9556368d270d73579a68db7e1bf" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_favorited_by_user" ADD CONSTRAINT "FK_c27a91d761c26ad612a0a356971" FOREIGN KEY ("answerId") REFERENCES "answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_query_log" ADD CONSTRAINT "FK_71ed57d6bb340716f5e17043bbb" FOREIGN KEY ("answerId") REFERENCES "answer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer_query_log" ADD CONSTRAINT "FK_f4b7cd859700f8928695b6c2bab" FOREIGN KEY ("viewerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer_update_log" ADD CONSTRAINT "FK_0ef2a982b61980d95b5ae7f1a60" FOREIGN KEY ("updaterId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer_update_log" ADD CONSTRAINT "FK_6f0964cf74c12678a86e49b23fe" FOREIGN KEY ("answerId") REFERENCES "answer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer_user_attitude" ADD CONSTRAINT "FK_2de5146dd65213f724e32745d06" FOREIGN KEY ("answerId") REFERENCES "answer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer_user_attitude" ADD CONSTRAINT "FK_7555fb52fdf623d67f9884ea63d" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attitude" ADD CONSTRAINT "attitude_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attitude_log" ADD CONSTRAINT "attitude_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "FK_63ac916757350d28f05c5a6a4ba" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comment_delete_log" ADD CONSTRAINT "FK_53f0a8befcc12c0f7f2bab7584d" FOREIGN KEY ("operatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comment_delete_log" ADD CONSTRAINT "FK_66705ce7d7908554cff01b260ec" FOREIGN KEY ("commentId") REFERENCES "comment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comment_query_log" ADD CONSTRAINT "FK_4020ff7fcffb2737e990f8bde5e" FOREIGN KEY ("commentId") REFERENCES "comment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comment_query_log" ADD CONSTRAINT "FK_4ead8566a6fa987264484b13d54" FOREIGN KEY ("viewerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "group_membership" ADD CONSTRAINT "FK_7d88d00d8617a802b698c0cd609" FOREIGN KEY ("memberId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "group_membership" ADD CONSTRAINT "FK_b1411f07fafcd5ad93c6ee16424" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "group_profile" ADD CONSTRAINT "group_profile_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "avatar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_profile" ADD CONSTRAINT "FK_7359ba99cc116d00cf74e048edd" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "group_question_relationship" ADD CONSTRAINT "FK_5b1232271bf29d99456fcf39e75" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "group_question_relationship" ADD CONSTRAINT "FK_b31bf3b3688ec41daaced89a0ab" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "group_target" ADD CONSTRAINT "FK_19d57f140124c5100e8e1ca3088" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_elasticsearch_relation" ADD CONSTRAINT "fk_question_elasticsearch_relation_question_id" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_invitation_relation" ADD CONSTRAINT "question_invitation_relation_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_invitation_relation" ADD CONSTRAINT "question_invitation_relation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "FK_187915d8eaa010cde8b053b35d5" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_follower_relation" ADD CONSTRAINT "FK_21a30245c4a32d5ac67da809010" FOREIGN KEY ("followerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_follower_relation" ADD CONSTRAINT "FK_6544f7f7579bf88e3c62f995f8a" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_query_log" ADD CONSTRAINT "FK_8ce4bcc67caf0406e6f20923d4d" FOREIGN KEY ("viewerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_query_log" ADD CONSTRAINT "FK_a0ee1672e103ed0a0266f217a3f" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_search_log" ADD CONSTRAINT "FK_13c7e9fd7403cc5a87ab6524bc4" FOREIGN KEY ("searcherId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_topic_relation" ADD CONSTRAINT "FK_d439ea68a02c1e7ea9863fc3df1" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_topic_relation" ADD CONSTRAINT "FK_dd4b9a1b83559fa38a3a50463fd" FOREIGN KEY ("topicId") REFERENCES "topic"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_topic_relation" ADD CONSTRAINT "FK_fab99c5e4fc380d9b7f9abbbb02" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "topic" ADD CONSTRAINT "FK_59d7548ea797208240417106e2d" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "topic_search_log" ADD CONSTRAINT "FK_fe1e75b8b625499f0119faaba5b" FOREIGN KEY ("searcherId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_following_relationship" ADD CONSTRAINT "FK_868df0c2c3a138ee54d2a515bce" FOREIGN KEY ("followerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_following_relationship" ADD CONSTRAINT "FK_c78831eeee179237b1482d0c6fb" FOREIGN KEY ("followeeId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_login_log" ADD CONSTRAINT "FK_66c592c7f7f20d1214aba2d0046" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "fk_user_profile_user_id" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "fk_user_profile_avatar_id" FOREIGN KEY ("avatarId") REFERENCES "avatar"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_profile_query_log" ADD CONSTRAINT "FK_1261db28434fde159acda6094bc" FOREIGN KEY ("viewerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_profile_query_log" ADD CONSTRAINT "FK_ff592e4403b328be0de4f2b3973" FOREIGN KEY ("vieweeId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
