// src/users/relationships/relationships.service.ts
import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { UserFollowingRelationship } from '@prisma/client';
import assert from 'node:assert';

import { PrismaService } from '../../common/prisma/prisma.service';
import { PageDto } from '../../common/DTO/page-response.dto';
import { PageHelper } from '../../common/helper/page.helper';

// TODO: Replace UserDto import with the one from account module once that's finalized
import { UserDto } from '../account/dto/user.dto';
// Errors
import {
  UserNotFollowedYetError,
  FollowYourselfError,
  UserAlreadyFollowedError,
} from './errors/relationships.error';
// TODO: Replace UserIdNotFoundError with the one from account module
import { UserIdNotFoundError } from '../account/errors/account.error';
// Need AccountService to fetch UserDto for followers/followees
// and to check if user exists (isUserExists)
import { AccountService } from '../account/account.service';


@Injectable()
export class RelationshipsService {
  private readonly logger = new Logger(RelationshipsService.name);

  constructor(
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => AccountService)) // AccountService for user DTOs and existence checks
    private readonly accountService: AccountService,
  ) {}

  private async getUniqueFollowRelationship(
    followerId: number,
    followeeId: number,
  ): Promise<UserFollowingRelationship | null> { // Return type changed to null for consistency
    // Prisma's findUnique will return null if not found, which is fine.
    // The original logic with findMany and then cleaning up duplicates seems overly complex
    // if the schema has a unique constraint on (followerId, followeeId).
    // Assuming such a constraint exists or should exist.
    return this.prismaService.userFollowingRelationship.findUnique({
      where: {
        followerId_followeeId: { // This assumes a composite key or unique index named followerId_followeeId
          followerId,
          followeeId,
        },
        deletedAt: null, // Ensure we only get active relationships
      },
    });
  }

  async addFollowRelationship(followerId: number, followeeId: number): Promise<void> {
    if (followerId === followeeId) {
      throw new FollowYourselfError();
    }
    // Check if both users exist using AccountService
    await this.accountService.findUserRecordOrThrow(followerId); // Throws UserIdNotFoundError if not found
    await this.accountService.findUserRecordOrThrow(followeeId);

    const existingRelationship = await this.getUniqueFollowRelationship(followerId, followeeId);
    if (existingRelationship) {
      throw new UserAlreadyFollowedError(followeeId);
    }

    await this.prismaService.userFollowingRelationship.create({
      data: {
        followerId,
        followeeId,
      },
    });
  }

  async deleteFollowRelationship(followerId: number, followeeId: number): Promise<void> {
    // Check if both users exist (optional, but good for consistency if followeeId might be invalid)
    // await this.accountService.findUserRecordOrThrow(followerId);
    // await this.accountService.findUserRecordOrThrow(followeeId);

    const existingRelationship = await this.getUniqueFollowRelationship(followerId, followeeId);
    if (!existingRelationship) {
      throw new UserNotFollowedYetError(followeeId);
    }
    // Soft delete by setting deletedAt
    await this.prismaService.userFollowingRelationship.update({
      where: {
        id: existingRelationship.id, // Use the primary key of the relationship
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async getFollowers(
    followeeId: number,
    firstFollowerId: number | undefined,
    pageSize: number,
    viewerId: number | undefined,
    ip: string, // For logging in AccountService.getUserDtoByIds
    userAgent: string | undefined, // For logging
  ): Promise<[UserDto[], PageDto]> {
    await this.accountService.findUserRecordOrThrow(followeeId); // Ensure the main user exists

    const commonWhere = { followeeId, deletedAt: null };
    let relations: UserFollowingRelationship[];

    if (firstFollowerId == undefined) {
      relations = await this.prismaService.userFollowingRelationship.findMany({
        where: commonWhere,
        take: pageSize + 1,
        orderBy: { followerId: 'asc' }, // Assuming followerId is a good proxy for "page start"
      });
    } else {
      relations = await this.prismaService.userFollowingRelationship.findMany({
        where: { ...commonWhere, followerId: { gte: firstFollowerId } },
        take: pageSize + 1,
        orderBy: { followerId: 'asc' },
      });
    }

    const followerIds = relations.map((r) => r.followerId);
    // Fetch DTOs for these follower IDs using AccountService
    const followerDtos = await this.accountService.getUsersDtoByIds(followerIds, viewerId, ip, userAgent);

    // Need to re-map pagination based on actual DTOs returned, as some users might not exist
    // or to ensure correct page boundaries if `getUsersDtoByIds` filters.
    // However, `getUsersDtoByIds` throws if a user ID is not found, so followerDtos will match followerIds.

    if (firstFollowerId == undefined) {
        return PageHelper.PageStart(followerDtos, pageSize, (item) => item.id);
    } else {
        // For PageMiddle, we need a way to count previous items correctly.
        // This might require a separate count query or adjustment in PageHelper.
        // For now, assume `firstFollowerId` is a valid cursor.
        const prevCount = await this.prismaService.userFollowingRelationship.count({
            where: { ...commonWhere, followerId: { lt: firstFollowerId } },
        });
        // Create a dummy array of prev items just for PageHelper.PageMiddle's current structure
        const dummyPrev = Array(prevCount).fill(null).map((_, idx) => ({followerId: firstFollowerId - prevCount + idx}));

        return PageHelper.PageMiddle(
            dummyPrev, // This is not ideal, PageHelper might need adjustment for cursor-based next/prev
            followerDtos,
            pageSize,
            (i) => i.followerId, // For dummyPrev
            (i) => i.id          // For followerDtos
        );
    }
  }

  async getFollowees(
    followerId: number,
    firstFolloweeId: number | undefined,
    pageSize: number,
    viewerId: number | undefined,
    ip: string, // For logging
    userAgent: string | undefined, // For logging
  ): Promise<[UserDto[], PageDto]> {
    await this.accountService.findUserRecordOrThrow(followerId); // Ensure the main user exists

    const commonWhere = { followerId, deletedAt: null };
    let relations: UserFollowingRelationship[];

    if (firstFolloweeId == undefined) {
        relations = await this.prismaService.userFollowingRelationship.findMany({
            where: commonWhere,
            take: pageSize + 1,
            orderBy: { followeeId: 'asc' },
        });
    } else {
        relations = await this.prismaService.userFollowingRelationship.findMany({
            where: { ...commonWhere, followeeId: { gte: firstFolloweeId } },
            take: pageSize + 1,
            orderBy: { followeeId: 'asc' },
        });
    }

    const followeeIds = relations.map((r) => r.followeeId);
    const followeeDtos = await this.accountService.getUsersDtoByIds(followeeIds, viewerId, ip, userAgent);

    if (firstFolloweeId == undefined) {
        return PageHelper.PageStart(followeeDtos, pageSize, (item) => item.id);
    } else {
        const prevCount = await this.prismaService.userFollowingRelationship.count({
            where: { ...commonWhere, followeeId: { lt: firstFolloweeId } },
        });
        const dummyPrev = Array(prevCount).fill(null).map((_, idx) => ({followeeId: firstFolloweeId - prevCount + idx }));

        return PageHelper.PageMiddle(
            dummyPrev,
            followeeDtos,
            pageSize,
            (i) => i.followeeId,
            (i) => i.id
        );
    }
  }

  async getFollowingCount(followerId: number): Promise<number> {
    await this.accountService.findUserRecordOrThrow(followerId);
    return this.prismaService.userFollowingRelationship.count({
      where: { followerId, deletedAt: null },
    });
  }

  // getFollowedCount is not directly used by controller but is a useful metric.
  // It's also part of the UserDto construction logic, which is in AccountService.
  // So this method might be redundant here if AccountService.UserDto already includes it.
  // For now, keeping it as it was in original UsersService.
  async getFollowedCount(followeeId: number): Promise<number> {
    await this.accountService.findUserRecordOrThrow(followeeId);
    return this.prismaService.userFollowingRelationship.count({
      where: { followeeId, deletedAt: null },
    });
  }

  async isUserFollowUser(followerId: number, followeeId: number): Promise<boolean> {
    // No need to check if users exist here, as getUniqueFollowRelationship will return null if no relationship
    // and the higher level operations (follow/unfollow) already check user existence.
    if (followerId === followeeId) return false; // Cannot follow self, though FollowYourselfError is more specific
    const relationship = await this.getUniqueFollowRelationship(followerId, followeeId);
    return !!relationship;
  }
}
