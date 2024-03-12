import { AttitudeType } from '@prisma/client';
import { IsOptional } from 'class-validator';
import { UserDto } from '../../users/DTO/user.dto';
import { CommentTag, CommentableType } from '../commentable.enum';

export class CommentDto {
  id: number;
  commentable_id: number;
  commentable_type: CommentableType;
  content: string;
  user: UserDto;
  created_at: number;
  attitude_type: AttitudeType;
  agree_count: number;
  disagree_count: number;
  @IsOptional()
  tag: CommentTag;
  @IsOptional()
  sub_comments: CommentDto[];
}
