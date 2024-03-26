/*
  Warnings:

  - You are about to drop the column `createdAt` on the `answer` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `answer` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `answer` table. All the data in the column will be lost.
  - You are about to drop the column `groupId` on the `answer` table. All the data in the column will be lost.
  - You are about to drop the column `questionId` on the `answer` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `answer` table. All the data in the column will be lost.
  - You are about to drop the column `answerId` on the `answer_delete_log` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `answer_delete_log` table. All the data in the column will be lost.
  - You are about to drop the column `deleterId` on the `answer_delete_log` table. All the data in the column will be lost.
  - The primary key for the `answer_favorited_by_user` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `answerId` on the `answer_favorited_by_user` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `answer_favorited_by_user` table. All the data in the column will be lost.
  - You are about to drop the column `answerId` on the `answer_query_log` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `answer_query_log` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `answer_query_log` table. All the data in the column will be lost.
  - You are about to drop the column `viewerId` on the `answer_query_log` table. All the data in the column will be lost.
  - You are about to drop the column `answerId` on the `answer_update_log` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `answer_update_log` table. All the data in the column will be lost.
  - You are about to drop the column `newContent` on the `answer_update_log` table. All the data in the column will be lost.
  - You are about to drop the column `oldContent` on the `answer_update_log` table. All the data in the column will be lost.
  - You are about to drop the column `updaterId` on the `answer_update_log` table. All the data in the column will be lost.
  - You are about to drop the column `answerId` on the `answer_user_attitude` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `answer_user_attitude` table. All the data in the column will be lost.
  - You are about to drop the column `attitudableId` on the `attitude` table. All the data in the column will be lost.
  - You are about to drop the column `attitudableType` on the `attitude` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `attitude` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `attitude` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `attitude` table. All the data in the column will be lost.
  - You are about to drop the column `attitudableId` on the `attitude_log` table. All the data in the column will be lost.
  - You are about to drop the column `attitudableType` on the `attitude_log` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `attitude_log` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `attitude_log` table. All the data in the column will be lost.
  - You are about to drop the column `avatarType` on the `avatar` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `avatar` table. All the data in the column will be lost.
  - You are about to drop the column `usageCount` on the `avatar` table. All the data in the column will be lost.
  - You are about to drop the column `commentableId` on the `comment` table. All the data in the column will be lost.
  - You are about to drop the column `commentableType` on the `comment` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `comment` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `comment` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `comment` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `comment` table. All the data in the column will be lost.
  - You are about to drop the column `commentId` on the `comment_delete_log` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `comment_delete_log` table. All the data in the column will be lost.
  - You are about to drop the column `operatedById` on the `comment_delete_log` table. All the data in the column will be lost.
  - You are about to drop the column `commentId` on the `comment_query_log` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `comment_query_log` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `comment_query_log` table. All the data in the column will be lost.
  - You are about to drop the column `viewerId` on the `comment_query_log` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `group` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `group` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `group` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `group_membership` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `group_membership` table. All the data in the column will be lost.
  - You are about to drop the column `groupId` on the `group_membership` table. All the data in the column will be lost.
  - You are about to drop the column `memberId` on the `group_membership` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `group_membership` table. All the data in the column will be lost.
  - You are about to drop the column `avatarId` on the `group_profile` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `group_profile` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `group_profile` table. All the data in the column will be lost.
  - You are about to drop the column `groupId` on the `group_profile` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `group_profile` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `group_question_relationship` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `group_question_relationship` table. All the data in the column will be lost.
  - You are about to drop the column `groupId` on the `group_question_relationship` table. All the data in the column will be lost.
  - You are about to drop the column `questionId` on the `group_question_relationship` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `group_question_relationship` table. All the data in the column will be lost.
  - You are about to drop the column `attendanceFrequency` on the `group_target` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `group_target` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `group_target` table. All the data in the column will be lost.
  - You are about to drop the column `endedAt` on the `group_target` table. All the data in the column will be lost.
  - You are about to drop the column `groupId` on the `group_target` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `group_target` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `group_target` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `question` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `question` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `question` table. All the data in the column will be lost.
  - You are about to drop the column `groupId` on the `question` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `question` table. All the data in the column will be lost.
  - You are about to drop the column `elasticsearchId` on the `question_elasticsearch_relation` table. All the data in the column will be lost.
  - You are about to drop the column `questionId` on the `question_elasticsearch_relation` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `question_follower_relation` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `question_follower_relation` table. All the data in the column will be lost.
  - You are about to drop the column `followerId` on the `question_follower_relation` table. All the data in the column will be lost.
  - You are about to drop the column `questionId` on the `question_follower_relation` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `question_invitation_relation` table. All the data in the column will be lost.
  - You are about to drop the column `questionId` on the `question_invitation_relation` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `question_invitation_relation` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `question_invitation_relation` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `question_query_log` table. All the data in the column will be lost.
  - You are about to drop the column `questionId` on the `question_query_log` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `question_query_log` table. All the data in the column will be lost.
  - You are about to drop the column `viewerId` on the `question_query_log` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `question_search_log` table. All the data in the column will be lost.
  - You are about to drop the column `firstQuestionId` on the `question_search_log` table. All the data in the column will be lost.
  - You are about to drop the column `pageSize` on the `question_search_log` table. All the data in the column will be lost.
  - You are about to drop the column `searcherId` on the `question_search_log` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `question_search_log` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `question_topic_relation` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `question_topic_relation` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `question_topic_relation` table. All the data in the column will be lost.
  - You are about to drop the column `questionId` on the `question_topic_relation` table. All the data in the column will be lost.
  - You are about to drop the column `topicId` on the `question_topic_relation` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `session` table. All the data in the column will be lost.
  - You are about to drop the column `lastRefreshedAt` on the `session` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `session` table. All the data in the column will be lost.
  - You are about to drop the column `validUntil` on the `session` table. All the data in the column will be lost.
  - You are about to drop the column `accessToken` on the `session_refresh_log` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `session_refresh_log` table. All the data in the column will be lost.
  - You are about to drop the column `newRefreshToken` on the `session_refresh_log` table. All the data in the column will be lost.
  - You are about to drop the column `oldRefreshToken` on the `session_refresh_log` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `session_refresh_log` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `topic` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `topic` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `topic` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `topic_search_log` table. All the data in the column will be lost.
  - You are about to drop the column `firstTopicId` on the `topic_search_log` table. All the data in the column will be lost.
  - You are about to drop the column `pageSize` on the `topic_search_log` table. All the data in the column will be lost.
  - You are about to drop the column `searcherId` on the `topic_search_log` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `topic_search_log` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `hashedPassword` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `user_following_relationship` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `user_following_relationship` table. All the data in the column will be lost.
  - You are about to drop the column `followeeId` on the `user_following_relationship` table. All the data in the column will be lost.
  - You are about to drop the column `followerId` on the `user_following_relationship` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `user_login_log` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `user_login_log` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `user_login_log` table. All the data in the column will be lost.
  - You are about to drop the column `avatarId` on the `user_profile` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `user_profile` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `user_profile` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `user_profile` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `user_profile` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `user_profile_query_log` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `user_profile_query_log` table. All the data in the column will be lost.
  - You are about to drop the column `vieweeId` on the `user_profile_query_log` table. All the data in the column will be lost.
  - You are about to drop the column `viewerId` on the `user_profile_query_log` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `user_register_log` table. All the data in the column will be lost.
  - You are about to drop the column `registerRequestId` on the `user_register_log` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `user_register_log` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `user_register_request` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `user_reset_password_log` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `user_reset_password_log` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `user_reset_password_log` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[attitudable_id,user_id,attitudable_type]` on the table `attitude` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[group_id]` on the table `group_profile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[question_id]` on the table `group_question_relationship` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[question_id]` on the table `question_elasticsearch_relation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id]` on the table `user_profile` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `created_by_id` to the `answer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `question_id` to the `answer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `answer_id` to the `answer_delete_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `answer_id` to the `answer_favorited_by_user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `answer_favorited_by_user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `answer_id` to the `answer_query_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_agent` to the `answer_query_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `answer_id` to the `answer_update_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `new_content` to the `answer_update_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `old_content` to the `answer_update_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `answer_id` to the `answer_user_attitude` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `answer_user_attitude` table without a default value. This is not possible if the table is not empty.
  - Added the required column `attitudable_id` to the `attitude` table without a default value. This is not possible if the table is not empty.
  - Added the required column `attitudable_type` to the `attitude` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `attitude` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `attitude` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `attitude` on the `attitude` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `attitudable_id` to the `attitude_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `attitudable_type` to the `attitude_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `attitude_log` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `attitude` on the `attitude_log` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `avatar_type` to the `avatar` table without a default value. This is not possible if the table is not empty.
  - Added the required column `commentable_id` to the `comment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `commentable_type` to the `comment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by_id` to the `comment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `comment_id` to the `comment_delete_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `operated_by_id` to the `comment_delete_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `comment_id` to the `comment_query_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_agent` to the `comment_query_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `group_id` to the `group_membership` table without a default value. This is not possible if the table is not empty.
  - Added the required column `member_id` to the `group_membership` table without a default value. This is not possible if the table is not empty.
  - Added the required column `group_id` to the `group_profile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_at` to the `group_question_relationship` table without a default value. This is not possible if the table is not empty.
  - Added the required column `group_id` to the `group_question_relationship` table without a default value. This is not possible if the table is not empty.
  - Added the required column `question_id` to the `group_question_relationship` table without a default value. This is not possible if the table is not empty.
  - Added the required column `attendance_frequency` to the `group_target` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ended_at` to the `group_target` table without a default value. This is not possible if the table is not empty.
  - Added the required column `group_id` to the `group_target` table without a default value. This is not possible if the table is not empty.
  - Added the required column `started_at` to the `group_target` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by_id` to the `question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `elasticsearch_id` to the `question_elasticsearch_relation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `question_id` to the `question_elasticsearch_relation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `follower_id` to the `question_follower_relation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `question_id` to the `question_follower_relation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `question_id` to the `question_invitation_relation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `question_invitation_relation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `question_invitation_relation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `question_id` to the `question_query_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_agent` to the `question_query_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `page_size` to the `question_search_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_agent` to the `question_search_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by_id` to the `question_topic_relation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `question_id` to the `question_topic_relation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `topic_id` to the `question_topic_relation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_refreshed_at` to the `session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `valid_until` to the `session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `access_token` to the `session_refresh_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `new_refresh_token` to the `session_refresh_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `old_refresh_token` to the `session_refresh_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `session_id` to the `session_refresh_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by_id` to the `topic` table without a default value. This is not possible if the table is not empty.
  - Added the required column `page_size` to the `topic_search_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_agent` to the `topic_search_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hashed_password` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `followee_id` to the `user_following_relationship` table without a default value. This is not possible if the table is not empty.
  - Added the required column `follower_id` to the `user_following_relationship` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_agent` to the `user_login_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `user_login_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `avatar_id` to the `user_profile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `user_profile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_agent` to the `user_profile_query_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `viewee_id` to the `user_profile_query_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_agent` to the `user_register_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_agent` to the `user_reset_password_log` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AttitudableType" AS ENUM ('COMMENT', 'QUESTION', 'ANSWER');

-- CreateEnum
CREATE TYPE "AttitudeType" AS ENUM ('UNDEFINED', 'POSITIVE', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "AttitudeTypeNotUndefined" AS ENUM ('POSITIVE', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "CommentCommentabletypeEnum" AS ENUM ('ANSWER', 'COMMENT', 'QUESTION');

-- DropForeignKey
ALTER TABLE "answer" DROP CONSTRAINT "FK_1887685ce6667b435b01c646a2c";

-- DropForeignKey
ALTER TABLE "answer" DROP CONSTRAINT "FK_a4013f10cd6924793fbd5f0d637";

-- DropForeignKey
ALTER TABLE "answer" DROP CONSTRAINT "FK_f636f6e852686173ea947f29045";

-- DropForeignKey
ALTER TABLE "answer_delete_log" DROP CONSTRAINT "FK_910393b814aac627593588c17fd";

-- DropForeignKey
ALTER TABLE "answer_delete_log" DROP CONSTRAINT "FK_c2d0251df4669e17a57d6dbc06f";

-- DropForeignKey
ALTER TABLE "answer_favorited_by_user" DROP CONSTRAINT "FK_9556368d270d73579a68db7e1bf";

-- DropForeignKey
ALTER TABLE "answer_favorited_by_user" DROP CONSTRAINT "FK_c27a91d761c26ad612a0a356971";

-- DropForeignKey
ALTER TABLE "answer_query_log" DROP CONSTRAINT "FK_71ed57d6bb340716f5e17043bbb";

-- DropForeignKey
ALTER TABLE "answer_query_log" DROP CONSTRAINT "FK_f4b7cd859700f8928695b6c2bab";

-- DropForeignKey
ALTER TABLE "answer_update_log" DROP CONSTRAINT "FK_0ef2a982b61980d95b5ae7f1a60";

-- DropForeignKey
ALTER TABLE "answer_update_log" DROP CONSTRAINT "FK_6f0964cf74c12678a86e49b23fe";

-- DropForeignKey
ALTER TABLE "answer_user_attitude" DROP CONSTRAINT "FK_2de5146dd65213f724e32745d06";

-- DropForeignKey
ALTER TABLE "answer_user_attitude" DROP CONSTRAINT "FK_7555fb52fdf623d67f9884ea63d";

-- DropForeignKey
ALTER TABLE "attitude" DROP CONSTRAINT "attitude_userId_fkey";

-- DropForeignKey
ALTER TABLE "attitude_log" DROP CONSTRAINT "attitude_log_userId_fkey";

-- DropForeignKey
ALTER TABLE "comment" DROP CONSTRAINT "FK_63ac916757350d28f05c5a6a4ba";

-- DropForeignKey
ALTER TABLE "comment_delete_log" DROP CONSTRAINT "FK_53f0a8befcc12c0f7f2bab7584d";

-- DropForeignKey
ALTER TABLE "comment_delete_log" DROP CONSTRAINT "FK_66705ce7d7908554cff01b260ec";

-- DropForeignKey
ALTER TABLE "comment_query_log" DROP CONSTRAINT "FK_4020ff7fcffb2737e990f8bde5e";

-- DropForeignKey
ALTER TABLE "comment_query_log" DROP CONSTRAINT "FK_4ead8566a6fa987264484b13d54";

-- DropForeignKey
ALTER TABLE "group_membership" DROP CONSTRAINT "FK_7d88d00d8617a802b698c0cd609";

-- DropForeignKey
ALTER TABLE "group_membership" DROP CONSTRAINT "FK_b1411f07fafcd5ad93c6ee16424";

-- DropForeignKey
ALTER TABLE "group_profile" DROP CONSTRAINT "FK_7359ba99cc116d00cf74e048edd";

-- DropForeignKey
ALTER TABLE "group_profile" DROP CONSTRAINT "group_profile_avatarId_fkey";

-- DropForeignKey
ALTER TABLE "group_question_relationship" DROP CONSTRAINT "FK_5b1232271bf29d99456fcf39e75";

-- DropForeignKey
ALTER TABLE "group_question_relationship" DROP CONSTRAINT "FK_b31bf3b3688ec41daaced89a0ab";

-- DropForeignKey
ALTER TABLE "group_target" DROP CONSTRAINT "FK_19d57f140124c5100e8e1ca3088";

-- DropForeignKey
ALTER TABLE "question" DROP CONSTRAINT "FK_187915d8eaa010cde8b053b35d5";

-- DropForeignKey
ALTER TABLE "question_elasticsearch_relation" DROP CONSTRAINT "fk_question_elasticsearch_relation_question_id";

-- DropForeignKey
ALTER TABLE "question_follower_relation" DROP CONSTRAINT "FK_21a30245c4a32d5ac67da809010";

-- DropForeignKey
ALTER TABLE "question_follower_relation" DROP CONSTRAINT "FK_6544f7f7579bf88e3c62f995f8a";

-- DropForeignKey
ALTER TABLE "question_invitation_relation" DROP CONSTRAINT "question_invitation_relation_questionId_fkey";

-- DropForeignKey
ALTER TABLE "question_invitation_relation" DROP CONSTRAINT "question_invitation_relation_userId_fkey";

-- DropForeignKey
ALTER TABLE "question_query_log" DROP CONSTRAINT "FK_8ce4bcc67caf0406e6f20923d4d";

-- DropForeignKey
ALTER TABLE "question_query_log" DROP CONSTRAINT "FK_a0ee1672e103ed0a0266f217a3f";

-- DropForeignKey
ALTER TABLE "question_search_log" DROP CONSTRAINT "FK_13c7e9fd7403cc5a87ab6524bc4";

-- DropForeignKey
ALTER TABLE "question_topic_relation" DROP CONSTRAINT "FK_d439ea68a02c1e7ea9863fc3df1";

-- DropForeignKey
ALTER TABLE "question_topic_relation" DROP CONSTRAINT "FK_dd4b9a1b83559fa38a3a50463fd";

-- DropForeignKey
ALTER TABLE "question_topic_relation" DROP CONSTRAINT "FK_fab99c5e4fc380d9b7f9abbbb02";

-- DropForeignKey
ALTER TABLE "topic" DROP CONSTRAINT "FK_59d7548ea797208240417106e2d";

-- DropForeignKey
ALTER TABLE "topic_search_log" DROP CONSTRAINT "FK_fe1e75b8b625499f0119faaba5b";

-- DropForeignKey
ALTER TABLE "user_following_relationship" DROP CONSTRAINT "FK_868df0c2c3a138ee54d2a515bce";

-- DropForeignKey
ALTER TABLE "user_following_relationship" DROP CONSTRAINT "FK_c78831eeee179237b1482d0c6fb";

-- DropForeignKey
ALTER TABLE "user_login_log" DROP CONSTRAINT "FK_66c592c7f7f20d1214aba2d0046";

-- DropForeignKey
ALTER TABLE "user_profile" DROP CONSTRAINT "fk_user_profile_avatar_id";

-- DropForeignKey
ALTER TABLE "user_profile" DROP CONSTRAINT "fk_user_profile_user_id";

-- DropForeignKey
ALTER TABLE "user_profile_query_log" DROP CONSTRAINT "FK_1261db28434fde159acda6094bc";

-- DropForeignKey
ALTER TABLE "user_profile_query_log" DROP CONSTRAINT "FK_ff592e4403b328be0de4f2b3973";

-- DropIndex
DROP INDEX "IDX_1887685ce6667b435b01c646a2";

-- DropIndex
DROP INDEX "IDX_a4013f10cd6924793fbd5f0d63";

-- DropIndex
DROP INDEX "IDX_f636f6e852686173ea947f2904";

-- DropIndex
DROP INDEX "IDX_910393b814aac627593588c17f";

-- DropIndex
DROP INDEX "IDX_c2d0251df4669e17a57d6dbc06";

-- DropIndex
DROP INDEX "IDX_9556368d270d73579a68db7e1b";

-- DropIndex
DROP INDEX "IDX_c27a91d761c26ad612a0a35697";

-- DropIndex
DROP INDEX "IDX_71ed57d6bb340716f5e17043bb";

-- DropIndex
DROP INDEX "IDX_f4b7cd859700f8928695b6c2ba";

-- DropIndex
DROP INDEX "IDX_0ef2a982b61980d95b5ae7f1a6";

-- DropIndex
DROP INDEX "IDX_6f0964cf74c12678a86e49b23f";

-- DropIndex
DROP INDEX "attitude_attitudableId_userId_attitudableType_key";

-- DropIndex
DROP INDEX "attitude_userId_idx";

-- DropIndex
DROP INDEX "attitude_log_attitudableId_attitudableType_idx";

-- DropIndex
DROP INDEX "attitude_log_userId_idx";

-- DropIndex
DROP INDEX "IDX_525212ea7a75cba69724e42303";

-- DropIndex
DROP INDEX "IDX_63ac916757350d28f05c5a6a4b";

-- DropIndex
DROP INDEX "IDX_53f0a8befcc12c0f7f2bab7584";

-- DropIndex
DROP INDEX "IDX_66705ce7d7908554cff01b260e";

-- DropIndex
DROP INDEX "IDX_4020ff7fcffb2737e990f8bde5";

-- DropIndex
DROP INDEX "IDX_4ead8566a6fa987264484b13d5";

-- DropIndex
DROP INDEX "IDX_7d88d00d8617a802b698c0cd60";

-- DropIndex
DROP INDEX "IDX_b1411f07fafcd5ad93c6ee1642";

-- DropIndex
DROP INDEX "REL_7359ba99cc116d00cf74e048ed";

-- DropIndex
DROP INDEX "IDX_b31bf3b3688ec41daaced89a0a";

-- DropIndex
DROP INDEX "REL_5b1232271bf29d99456fcf39e7";

-- DropIndex
DROP INDEX "IDX_19d57f140124c5100e8e1ca308";

-- DropIndex
DROP INDEX "IDX_187915d8eaa010cde8b053b35d";

-- DropIndex
DROP INDEX "IDX_ac7c68d428ab7ffd2f4752eeaa";

-- DropIndex
DROP INDEX "question_elasticsearch_relation_questionId_key";

-- DropIndex
DROP INDEX "IDX_21a30245c4a32d5ac67da80901";

-- DropIndex
DROP INDEX "IDX_6544f7f7579bf88e3c62f995f8";

-- DropIndex
DROP INDEX "question_invitation_relation_questionId_idx";

-- DropIndex
DROP INDEX "question_invitation_relation_userId_idx";

-- DropIndex
DROP INDEX "IDX_8ce4bcc67caf0406e6f20923d4";

-- DropIndex
DROP INDEX "IDX_a0ee1672e103ed0a0266f217a3";

-- DropIndex
DROP INDEX "IDX_13c7e9fd7403cc5a87ab6524bc";

-- DropIndex
DROP INDEX "IDX_dd4b9a1b83559fa38a3a50463f";

-- DropIndex
DROP INDEX "IDX_fab99c5e4fc380d9b7f9abbbb0";

-- DropIndex
DROP INDEX "IDX_3d2f174ef04fb312fdebd0ddc5";

-- DropIndex
DROP INDEX "IDX_bb46e87d5b3f1e55c625755c00";

-- DropIndex
DROP INDEX "IDX_59d7548ea797208240417106e2";

-- DropIndex
DROP INDEX "IDX_fe1e75b8b625499f0119faaba5";

-- DropIndex
DROP INDEX "IDX_868df0c2c3a138ee54d2a515bc";

-- DropIndex
DROP INDEX "IDX_c78831eeee179237b1482d0c6f";

-- DropIndex
DROP INDEX "IDX_66c592c7f7f20d1214aba2d004";

-- DropIndex
DROP INDEX "IDX_51cb79b5555effaf7d69ba1cff";

-- DropIndex
DROP INDEX "IDX_1261db28434fde159acda6094b";

-- DropIndex
DROP INDEX "IDX_ff592e4403b328be0de4f2b397";

-- AlterTable
ALTER TABLE "answer" DROP COLUMN "createdAt",
DROP COLUMN "createdById",
DROP COLUMN "deletedAt",
DROP COLUMN "groupId",
DROP COLUMN "questionId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by_id" INTEGER NOT NULL,
ADD COLUMN     "deleted_at" TIMESTAMP(6),
ADD COLUMN     "group_id" INTEGER,
ADD COLUMN     "question_id" INTEGER NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "answer_delete_log" DROP COLUMN "answerId",
DROP COLUMN "createdAt",
DROP COLUMN "deleterId",
ADD COLUMN     "answer_id" INTEGER NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleter_id" INTEGER;

-- AlterTable
ALTER TABLE "answer_favorited_by_user" DROP CONSTRAINT "PK_5a857fe93c44fdb538ec5aa4771",
DROP COLUMN "answerId",
DROP COLUMN "userId",
ADD COLUMN     "answer_id" INTEGER NOT NULL,
ADD COLUMN     "user_id" INTEGER NOT NULL,
ADD CONSTRAINT "PK_5a857fe93c44fdb538ec5aa4771" PRIMARY KEY ("answer_id", "user_id");

-- AlterTable
ALTER TABLE "answer_query_log" DROP COLUMN "answerId",
DROP COLUMN "createdAt",
DROP COLUMN "userAgent",
DROP COLUMN "viewerId",
ADD COLUMN     "answer_id" INTEGER NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "user_agent" VARCHAR NOT NULL,
ADD COLUMN     "viewer_id" INTEGER;

-- AlterTable
ALTER TABLE "answer_update_log" DROP COLUMN "answerId",
DROP COLUMN "createdAt",
DROP COLUMN "newContent",
DROP COLUMN "oldContent",
DROP COLUMN "updaterId",
ADD COLUMN     "answer_id" INTEGER NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "new_content" TEXT NOT NULL,
ADD COLUMN     "old_content" TEXT NOT NULL,
ADD COLUMN     "updater_id" INTEGER;

-- AlterTable
ALTER TABLE "answer_user_attitude" DROP COLUMN "answerId",
DROP COLUMN "userId",
ADD COLUMN     "answer_id" INTEGER NOT NULL,
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "attitude" DROP COLUMN "attitudableId",
DROP COLUMN "attitudableType",
DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "attitudable_id" INTEGER NOT NULL,
ADD COLUMN     "attitudable_type" "AttitudableType" NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" INTEGER NOT NULL,
DROP COLUMN "attitude",
ADD COLUMN     "attitude" "AttitudeTypeNotUndefined" NOT NULL;

-- AlterTable
ALTER TABLE "attitude_log" DROP COLUMN "attitudableId",
DROP COLUMN "attitudableType",
DROP COLUMN "createdAt",
DROP COLUMN "userId",
ADD COLUMN     "attitudable_id" INTEGER NOT NULL,
ADD COLUMN     "attitudable_type" "AttitudableType" NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "user_id" INTEGER NOT NULL,
DROP COLUMN "attitude",
ADD COLUMN     "attitude" "AttitudeType" NOT NULL;

-- AlterTable
ALTER TABLE "avatar" DROP COLUMN "avatarType",
DROP COLUMN "createdAt",
DROP COLUMN "usageCount",
ADD COLUMN     "avatar_type" VARCHAR NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "usage_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "comment" DROP COLUMN "commentableId",
DROP COLUMN "commentableType",
DROP COLUMN "createdAt",
DROP COLUMN "createdById",
DROP COLUMN "deletedAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "commentable_id" INTEGER NOT NULL,
ADD COLUMN     "commentable_type" "CommentCommentabletypeEnum" NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by_id" INTEGER NOT NULL,
ADD COLUMN     "deleted_at" TIMESTAMP(6),
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "comment_delete_log" DROP COLUMN "commentId",
DROP COLUMN "createdAt",
DROP COLUMN "operatedById",
ADD COLUMN     "comment_id" INTEGER NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "operated_by_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "comment_query_log" DROP COLUMN "commentId",
DROP COLUMN "createdAt",
DROP COLUMN "userAgent",
DROP COLUMN "viewerId",
ADD COLUMN     "comment_id" INTEGER NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "user_agent" VARCHAR NOT NULL,
ADD COLUMN     "viewer_id" INTEGER;

-- AlterTable
ALTER TABLE "group" DROP COLUMN "createdAt",
DROP COLUMN "deletedAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT ('now'::text)::timestamp(3) with time zone,
ADD COLUMN     "deleted_at" TIMESTAMP(6),
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "group_membership" DROP COLUMN "createdAt",
DROP COLUMN "deletedAt",
DROP COLUMN "groupId",
DROP COLUMN "memberId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(6),
ADD COLUMN     "group_id" INTEGER NOT NULL,
ADD COLUMN     "member_id" INTEGER NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "group_profile" DROP COLUMN "avatarId",
DROP COLUMN "createdAt",
DROP COLUMN "deletedAt",
DROP COLUMN "groupId",
DROP COLUMN "updatedAt",
ADD COLUMN     "avatar_id" INTEGER,
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(6),
ADD COLUMN     "group_id" INTEGER NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "group_question_relationship" DROP COLUMN "createdAt",
DROP COLUMN "deletedAt",
DROP COLUMN "groupId",
DROP COLUMN "questionId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL,
ADD COLUMN     "deleted_at" TIMESTAMP(6),
ADD COLUMN     "group_id" INTEGER NOT NULL,
ADD COLUMN     "question_id" INTEGER NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "group_target" DROP COLUMN "attendanceFrequency",
DROP COLUMN "createdAt",
DROP COLUMN "deletedAt",
DROP COLUMN "endedAt",
DROP COLUMN "groupId",
DROP COLUMN "startedAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "attendance_frequency" VARCHAR NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(6),
ADD COLUMN     "ended_at" DATE NOT NULL,
ADD COLUMN     "group_id" INTEGER NOT NULL,
ADD COLUMN     "started_at" DATE NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "question" DROP COLUMN "createdAt",
DROP COLUMN "createdById",
DROP COLUMN "deletedAt",
DROP COLUMN "groupId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by_id" INTEGER NOT NULL,
ADD COLUMN     "deleted_at" TIMESTAMP(6),
ADD COLUMN     "group_id" INTEGER,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "question_elasticsearch_relation" DROP COLUMN "elasticsearchId",
DROP COLUMN "questionId",
ADD COLUMN     "elasticsearch_id" TEXT NOT NULL,
ADD COLUMN     "question_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "question_follower_relation" DROP COLUMN "createdAt",
DROP COLUMN "deletedAt",
DROP COLUMN "followerId",
DROP COLUMN "questionId",
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(6),
ADD COLUMN     "follower_id" INTEGER NOT NULL,
ADD COLUMN     "question_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "question_invitation_relation" DROP COLUMN "createdAt",
DROP COLUMN "questionId",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "question_id" INTEGER NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "question_query_log" DROP COLUMN "createdAt",
DROP COLUMN "questionId",
DROP COLUMN "userAgent",
DROP COLUMN "viewerId",
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "question_id" INTEGER NOT NULL,
ADD COLUMN     "user_agent" VARCHAR NOT NULL,
ADD COLUMN     "viewer_id" INTEGER;

-- AlterTable
ALTER TABLE "question_search_log" DROP COLUMN "createdAt",
DROP COLUMN "firstQuestionId",
DROP COLUMN "pageSize",
DROP COLUMN "searcherId",
DROP COLUMN "userAgent",
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "first_question_id" INTEGER,
ADD COLUMN     "page_size" INTEGER NOT NULL,
ADD COLUMN     "searcher_id" INTEGER,
ADD COLUMN     "user_agent" VARCHAR NOT NULL;

-- AlterTable
ALTER TABLE "question_topic_relation" DROP COLUMN "createdAt",
DROP COLUMN "createdById",
DROP COLUMN "deletedAt",
DROP COLUMN "questionId",
DROP COLUMN "topicId",
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by_id" INTEGER NOT NULL,
ADD COLUMN     "deleted_at" TIMESTAMP(6),
ADD COLUMN     "question_id" INTEGER NOT NULL,
ADD COLUMN     "topic_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "session" DROP COLUMN "createdAt",
DROP COLUMN "lastRefreshedAt",
DROP COLUMN "userId",
DROP COLUMN "validUntil",
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "last_refreshed_at" BIGINT NOT NULL,
ADD COLUMN     "user_id" INTEGER NOT NULL,
ADD COLUMN     "valid_until" TIMESTAMP(6) NOT NULL;

-- AlterTable
ALTER TABLE "session_refresh_log" DROP COLUMN "accessToken",
DROP COLUMN "createdAt",
DROP COLUMN "newRefreshToken",
DROP COLUMN "oldRefreshToken",
DROP COLUMN "sessionId",
ADD COLUMN     "access_token" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "new_refresh_token" TEXT NOT NULL,
ADD COLUMN     "old_refresh_token" TEXT NOT NULL,
ADD COLUMN     "session_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "topic" DROP COLUMN "createdAt",
DROP COLUMN "createdById",
DROP COLUMN "deletedAt",
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by_id" INTEGER NOT NULL,
ADD COLUMN     "deleted_at" TIMESTAMP(6);

-- AlterTable
ALTER TABLE "topic_search_log" DROP COLUMN "createdAt",
DROP COLUMN "firstTopicId",
DROP COLUMN "pageSize",
DROP COLUMN "searcherId",
DROP COLUMN "userAgent",
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "first_topic_id" INTEGER,
ADD COLUMN     "page_size" INTEGER NOT NULL,
ADD COLUMN     "searcher_id" INTEGER,
ADD COLUMN     "user_agent" VARCHAR NOT NULL;

-- AlterTable
ALTER TABLE "user" DROP COLUMN "createdAt",
DROP COLUMN "deletedAt",
DROP COLUMN "hashedPassword",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(6),
ADD COLUMN     "hashed_password" VARCHAR NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "user_following_relationship" DROP COLUMN "createdAt",
DROP COLUMN "deletedAt",
DROP COLUMN "followeeId",
DROP COLUMN "followerId",
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(6),
ADD COLUMN     "followee_id" INTEGER NOT NULL,
ADD COLUMN     "follower_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "user_login_log" DROP COLUMN "createdAt",
DROP COLUMN "userAgent",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "user_agent" VARCHAR NOT NULL,
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "user_profile" DROP COLUMN "avatarId",
DROP COLUMN "createdAt",
DROP COLUMN "deletedAt",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "avatar_id" INTEGER NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(6),
ADD COLUMN     "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "user_profile_query_log" DROP COLUMN "createdAt",
DROP COLUMN "userAgent",
DROP COLUMN "vieweeId",
DROP COLUMN "viewerId",
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "user_agent" VARCHAR NOT NULL,
ADD COLUMN     "viewee_id" INTEGER NOT NULL,
ADD COLUMN     "viewer_id" INTEGER;

-- AlterTable
ALTER TABLE "user_register_log" DROP COLUMN "createdAt",
DROP COLUMN "registerRequestId",
DROP COLUMN "userAgent",
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "register_request_id" INTEGER,
ADD COLUMN     "user_agent" VARCHAR NOT NULL;

-- AlterTable
ALTER TABLE "user_register_request" DROP COLUMN "createdAt",
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "user_reset_password_log" DROP COLUMN "createdAt",
DROP COLUMN "userAgent",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "user_agent" VARCHAR NOT NULL,
ADD COLUMN     "user_id" INTEGER;

-- DropEnum
DROP TYPE "attitudable_type";

-- DropEnum
DROP TYPE "attitude_type";

-- DropEnum
DROP TYPE "attitude_type_not_undefined";

-- DropEnum
DROP TYPE "comment_commentabletype_enum";

-- CreateIndex
CREATE INDEX "IDX_1887685ce6667b435b01c646a2" ON "answer"("group_id");

-- CreateIndex
CREATE INDEX "IDX_a4013f10cd6924793fbd5f0d63" ON "answer"("question_id");

-- CreateIndex
CREATE INDEX "IDX_f636f6e852686173ea947f2904" ON "answer"("created_by_id");

-- CreateIndex
CREATE INDEX "IDX_910393b814aac627593588c17f" ON "answer_delete_log"("answer_id");

-- CreateIndex
CREATE INDEX "IDX_c2d0251df4669e17a57d6dbc06" ON "answer_delete_log"("deleter_id");

-- CreateIndex
CREATE INDEX "IDX_9556368d270d73579a68db7e1b" ON "answer_favorited_by_user"("user_id");

-- CreateIndex
CREATE INDEX "IDX_c27a91d761c26ad612a0a35697" ON "answer_favorited_by_user"("answer_id");

-- CreateIndex
CREATE INDEX "IDX_71ed57d6bb340716f5e17043bb" ON "answer_query_log"("answer_id");

-- CreateIndex
CREATE INDEX "IDX_f4b7cd859700f8928695b6c2ba" ON "answer_query_log"("viewer_id");

-- CreateIndex
CREATE INDEX "IDX_0ef2a982b61980d95b5ae7f1a6" ON "answer_update_log"("updater_id");

-- CreateIndex
CREATE INDEX "IDX_6f0964cf74c12678a86e49b23f" ON "answer_update_log"("answer_id");

-- CreateIndex
CREATE INDEX "attitude_user_id_idx" ON "attitude"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "attitude_attitudable_id_user_id_attitudable_type_key" ON "attitude"("attitudable_id", "user_id", "attitudable_type");

-- CreateIndex
CREATE INDEX "attitude_log_attitudable_id_attitudable_type_idx" ON "attitude_log"("attitudable_id", "attitudable_type");

-- CreateIndex
CREATE INDEX "attitude_log_user_id_idx" ON "attitude_log"("user_id");

-- CreateIndex
CREATE INDEX "IDX_525212ea7a75cba69724e42303" ON "comment"("commentable_id");

-- CreateIndex
CREATE INDEX "IDX_63ac916757350d28f05c5a6a4b" ON "comment"("created_by_id");

-- CreateIndex
CREATE INDEX "IDX_53f0a8befcc12c0f7f2bab7584" ON "comment_delete_log"("operated_by_id");

-- CreateIndex
CREATE INDEX "IDX_66705ce7d7908554cff01b260e" ON "comment_delete_log"("comment_id");

-- CreateIndex
CREATE INDEX "IDX_4020ff7fcffb2737e990f8bde5" ON "comment_query_log"("comment_id");

-- CreateIndex
CREATE INDEX "IDX_4ead8566a6fa987264484b13d5" ON "comment_query_log"("viewer_id");

-- CreateIndex
CREATE INDEX "IDX_7d88d00d8617a802b698c0cd60" ON "group_membership"("member_id");

-- CreateIndex
CREATE INDEX "IDX_b1411f07fafcd5ad93c6ee1642" ON "group_membership"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "REL_7359ba99cc116d00cf74e048ed" ON "group_profile"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "REL_5b1232271bf29d99456fcf39e7" ON "group_question_relationship"("question_id");

-- CreateIndex
CREATE INDEX "IDX_b31bf3b3688ec41daaced89a0a" ON "group_question_relationship"("group_id");

-- CreateIndex
CREATE INDEX "IDX_19d57f140124c5100e8e1ca308" ON "group_target"("group_id");

-- CreateIndex
CREATE INDEX "IDX_187915d8eaa010cde8b053b35d" ON "question"("created_by_id");

-- CreateIndex
CREATE INDEX "IDX_ac7c68d428ab7ffd2f4752eeaa" ON "question"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_elasticsearch_relation_question_id_key" ON "question_elasticsearch_relation"("question_id");

-- CreateIndex
CREATE INDEX "IDX_21a30245c4a32d5ac67da80901" ON "question_follower_relation"("follower_id");

-- CreateIndex
CREATE INDEX "IDX_6544f7f7579bf88e3c62f995f8" ON "question_follower_relation"("question_id");

-- CreateIndex
CREATE INDEX "question_invitation_relation_question_id_idx" ON "question_invitation_relation"("question_id");

-- CreateIndex
CREATE INDEX "question_invitation_relation_user_id_idx" ON "question_invitation_relation"("user_id");

-- CreateIndex
CREATE INDEX "IDX_8ce4bcc67caf0406e6f20923d4" ON "question_query_log"("viewer_id");

-- CreateIndex
CREATE INDEX "IDX_a0ee1672e103ed0a0266f217a3" ON "question_query_log"("question_id");

-- CreateIndex
CREATE INDEX "IDX_13c7e9fd7403cc5a87ab6524bc" ON "question_search_log"("searcher_id");

-- CreateIndex
CREATE INDEX "IDX_dd4b9a1b83559fa38a3a50463f" ON "question_topic_relation"("topic_id");

-- CreateIndex
CREATE INDEX "IDX_fab99c5e4fc380d9b7f9abbbb0" ON "question_topic_relation"("question_id");

-- CreateIndex
CREATE INDEX "IDX_3d2f174ef04fb312fdebd0ddc5" ON "session"("user_id");

-- CreateIndex
CREATE INDEX "IDX_bb46e87d5b3f1e55c625755c00" ON "session"("valid_until");

-- CreateIndex
CREATE INDEX "IDX_59d7548ea797208240417106e2" ON "topic"("created_by_id");

-- CreateIndex
CREATE INDEX "IDX_fe1e75b8b625499f0119faaba5" ON "topic_search_log"("searcher_id");

-- CreateIndex
CREATE INDEX "IDX_868df0c2c3a138ee54d2a515bc" ON "user_following_relationship"("follower_id");

-- CreateIndex
CREATE INDEX "IDX_c78831eeee179237b1482d0c6f" ON "user_following_relationship"("followee_id");

-- CreateIndex
CREATE INDEX "IDX_66c592c7f7f20d1214aba2d004" ON "user_login_log"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "IDX_51cb79b5555effaf7d69ba1cff" ON "user_profile"("user_id");

-- CreateIndex
CREATE INDEX "IDX_1261db28434fde159acda6094b" ON "user_profile_query_log"("viewer_id");

-- CreateIndex
CREATE INDEX "IDX_ff592e4403b328be0de4f2b397" ON "user_profile_query_log"("viewee_id");

-- AddForeignKey
ALTER TABLE "answer" ADD CONSTRAINT "FK_1887685ce6667b435b01c646a2c" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer" ADD CONSTRAINT "FK_a4013f10cd6924793fbd5f0d637" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer" ADD CONSTRAINT "FK_f636f6e852686173ea947f29045" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer_delete_log" ADD CONSTRAINT "FK_910393b814aac627593588c17fd" FOREIGN KEY ("answer_id") REFERENCES "answer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer_delete_log" ADD CONSTRAINT "FK_c2d0251df4669e17a57d6dbc06f" FOREIGN KEY ("deleter_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer_favorited_by_user" ADD CONSTRAINT "FK_9556368d270d73579a68db7e1bf" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_favorited_by_user" ADD CONSTRAINT "FK_c27a91d761c26ad612a0a356971" FOREIGN KEY ("answer_id") REFERENCES "answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_query_log" ADD CONSTRAINT "FK_71ed57d6bb340716f5e17043bbb" FOREIGN KEY ("answer_id") REFERENCES "answer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer_query_log" ADD CONSTRAINT "FK_f4b7cd859700f8928695b6c2bab" FOREIGN KEY ("viewer_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer_update_log" ADD CONSTRAINT "FK_0ef2a982b61980d95b5ae7f1a60" FOREIGN KEY ("updater_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer_update_log" ADD CONSTRAINT "FK_6f0964cf74c12678a86e49b23fe" FOREIGN KEY ("answer_id") REFERENCES "answer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer_user_attitude" ADD CONSTRAINT "FK_2de5146dd65213f724e32745d06" FOREIGN KEY ("answer_id") REFERENCES "answer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer_user_attitude" ADD CONSTRAINT "FK_7555fb52fdf623d67f9884ea63d" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attitude" ADD CONSTRAINT "attitude_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attitude_log" ADD CONSTRAINT "attitude_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "FK_63ac916757350d28f05c5a6a4ba" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comment_delete_log" ADD CONSTRAINT "FK_53f0a8befcc12c0f7f2bab7584d" FOREIGN KEY ("operated_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comment_delete_log" ADD CONSTRAINT "FK_66705ce7d7908554cff01b260ec" FOREIGN KEY ("comment_id") REFERENCES "comment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comment_query_log" ADD CONSTRAINT "FK_4020ff7fcffb2737e990f8bde5e" FOREIGN KEY ("comment_id") REFERENCES "comment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comment_query_log" ADD CONSTRAINT "FK_4ead8566a6fa987264484b13d54" FOREIGN KEY ("viewer_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "group_membership" ADD CONSTRAINT "FK_7d88d00d8617a802b698c0cd609" FOREIGN KEY ("member_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "group_membership" ADD CONSTRAINT "FK_b1411f07fafcd5ad93c6ee16424" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "group_profile" ADD CONSTRAINT "group_profile_avatar_id_fkey" FOREIGN KEY ("avatar_id") REFERENCES "avatar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_profile" ADD CONSTRAINT "FK_7359ba99cc116d00cf74e048edd" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "group_question_relationship" ADD CONSTRAINT "FK_5b1232271bf29d99456fcf39e75" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "group_question_relationship" ADD CONSTRAINT "FK_b31bf3b3688ec41daaced89a0ab" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "group_target" ADD CONSTRAINT "FK_19d57f140124c5100e8e1ca3088" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_elasticsearch_relation" ADD CONSTRAINT "fk_question_elasticsearch_relation_question_id" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_invitation_relation" ADD CONSTRAINT "question_invitation_relation_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_invitation_relation" ADD CONSTRAINT "question_invitation_relation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "FK_187915d8eaa010cde8b053b35d5" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_follower_relation" ADD CONSTRAINT "FK_21a30245c4a32d5ac67da809010" FOREIGN KEY ("follower_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_follower_relation" ADD CONSTRAINT "FK_6544f7f7579bf88e3c62f995f8a" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_query_log" ADD CONSTRAINT "FK_8ce4bcc67caf0406e6f20923d4d" FOREIGN KEY ("viewer_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_query_log" ADD CONSTRAINT "FK_a0ee1672e103ed0a0266f217a3f" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_search_log" ADD CONSTRAINT "FK_13c7e9fd7403cc5a87ab6524bc4" FOREIGN KEY ("searcher_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_topic_relation" ADD CONSTRAINT "FK_d439ea68a02c1e7ea9863fc3df1" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_topic_relation" ADD CONSTRAINT "FK_dd4b9a1b83559fa38a3a50463fd" FOREIGN KEY ("topic_id") REFERENCES "topic"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_topic_relation" ADD CONSTRAINT "FK_fab99c5e4fc380d9b7f9abbbb02" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "topic" ADD CONSTRAINT "FK_59d7548ea797208240417106e2d" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "topic_search_log" ADD CONSTRAINT "FK_fe1e75b8b625499f0119faaba5b" FOREIGN KEY ("searcher_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_following_relationship" ADD CONSTRAINT "FK_868df0c2c3a138ee54d2a515bce" FOREIGN KEY ("follower_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_following_relationship" ADD CONSTRAINT "FK_c78831eeee179237b1482d0c6fb" FOREIGN KEY ("followee_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_login_log" ADD CONSTRAINT "FK_66c592c7f7f20d1214aba2d0046" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "fk_user_profile_user_id" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "fk_user_profile_avatar_id" FOREIGN KEY ("avatar_id") REFERENCES "avatar"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_profile_query_log" ADD CONSTRAINT "FK_1261db28434fde159acda6094bc" FOREIGN KEY ("viewer_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_profile_query_log" ADD CONSTRAINT "FK_ff592e4403b328be0de4f2b3973" FOREIGN KEY ("viewee_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
