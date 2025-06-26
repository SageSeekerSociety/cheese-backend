// src/users/relationships/relationships.controller.ts
import {
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  Ip,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseFilters,
  forwardRef,
} from '@nestjs/common';

import { AuthToken, Guard, ResourceId } from '../../auth/guard.decorator';
import { UserId } from '../../auth/user-id.decorator';
import { PageDto } from '../../common/DTO/page.dto';
import { BaseErrorExceptionFilter } from '../../common/error/error-filter';

// DTOs from this module
import { FollowResponseDto, UnfollowResponseDto } from './dto/follow-unfollow.dto';
import { GetFollowersResponseDto } from './dto/get-followers.dto'; // Used for both followers and followees lists

// Service from this module
import { RelationshipsService } from './relationships.service';

// TODO: Remove direct dependency on UsersService once AccountService is fully providing UserDto
import { UsersService } from '../users.service';
import { ResourceOwnerIdGetter } from '../../auth/guard.decorator'; // Import for Guard

@Controller('/users') // Base path /users, specific relationship paths defined in methods
@UseFilters(BaseErrorExceptionFilter)
export class RelationshipsController {
  // For routes like GET /:id/followers, the :id is the user being viewed.
  // The Guard's 'user' resource type implies the resource ID from the path is the owner.
  @ResourceOwnerIdGetter('user')
  async getUserOwner(userId: number): Promise<number | undefined> {
    return userId;
  }
  private readonly logger = new Logger(RelationshipsController.name);

  constructor(
    private readonly relationshipsService: RelationshipsService,
    // Temporary: For getFollowingCount which might eventually be part of RelationshipsService or UserDto itself
    @Inject(forwardRef(() => UsersService))
    private readonly usersServiceOriginal: UsersService,
  ) {}

  // Define ResourceOwnerIdGetter if needed for Guards, or move Guard logic to service if complex
  // For follower actions, the @UserId() acting user is different from the @Param('id') target user.
  // The Guard should correctly differentiate between "acting user must be self" vs "acting user must exist".

  @Post('/:id/followers')
  @Guard('follow', 'user') // 'follow' permission, resource is the user being followed
  async followUser(
    @Param('id', ParseIntPipe) @ResourceId() targetUserId: number, // User to be followed
    @UserId(true) currentUserId: number, // The user performing the follow action (follower)
    // @Headers('Authorization') @AuthToken() auth: string | undefined, // Handled by Guard
  ): Promise<FollowResponseDto> {
    await this.relationshipsService.addFollowRelationship(currentUserId, targetUserId);
    // The follow_count should ideally be for the `currentUserId` (the one who performed the action)
    const followCount = await this.relationshipsService.getFollowingCount(currentUserId);
    return {
      code: 201,
      message: 'Follow user successfully.',
      data: { follow_count: followCount },
    };
  }

  @Delete('/:id/followers')
  @Guard('unfollow', 'user') // 'unfollow' permission
  async unfollowUser(
    @Param('id', ParseIntPipe) @ResourceId() targetUserId: number, // User to be unfollowed
    @UserId(true) currentUserId: number, // The user performing the unfollow action
    // @Headers('Authorization') @AuthToken() auth: string | undefined, // Handled by Guard
  ): Promise<UnfollowResponseDto> {
    await this.relationshipsService.deleteFollowRelationship(currentUserId, targetUserId);
    const followCount = await this.relationshipsService.getFollowingCount(currentUserId);
    return {
      code: 200,
      message: 'Unfollow user successfully.',
      data: { follow_count: followCount },
    };
  }

  @Get('/:id/followers')
  @Guard('enumerate-followers', 'user') // Permission to list followers of user :id
  async getFollowers(
    @Param('id', ParseIntPipe) @ResourceId() userIdToView: number, // The user whose followers are being listed
    @Query() { page_start: pageStart, page_size: pageSize }: PageDto,
    @UserId() viewerId: number | undefined, // The user viewing the list (optional)
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    // @Headers('Authorization') @AuthToken() auth: string | undefined, // Handled by Guard
  ): Promise<GetFollowersResponseDto> {
    const effectivePageSize = pageSize == undefined || pageSize <= 0 ? 20 : pageSize;
    const [followers, page] = await this.relationshipsService.getFollowers(
      userIdToView,
      pageStart, // firstFollowerId might be undefined
      effectivePageSize,
      viewerId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'Query followers successfully.',
      data: {
        users: followers,
        page: page,
      },
    };
  }

  @Get('/:id/follow/users') // Path to get users someone is following (followees)
  @Guard('enumerate-followed-users', 'user') // Permission to list who user :id is following
  async getFollowees(
    @Param('id', ParseIntPipe) @ResourceId() userIdToView: number, // The user whose followees are being listed
    @Query() { page_start: pageStart, page_size: pageSize }: PageDto,
    @UserId() viewerId: number | undefined, // The user viewing the list
    @Ip() ip: string,
    @Headers('User-Agent') userAgent: string | undefined,
    // @Headers('Authorization') @AuthToken() auth: string | undefined, // Handled by Guard
  ): Promise<GetFollowersResponseDto> { // Re-uses GetFollowersResponseDto as structure is same
    const effectivePageSize = pageSize == undefined || pageSize <= 0 ? 20 : pageSize;
    const [followees, page] = await this.relationshipsService.getFollowees(
      userIdToView,
      pageStart, // firstFolloweeId might be undefined
      effectivePageSize,
      viewerId,
      ip,
      userAgent,
    );
    return {
      code: 200,
      message: 'Query followees successfully.',
      data: {
        users: followees,
        page: page,
      },
    };
  }
}
