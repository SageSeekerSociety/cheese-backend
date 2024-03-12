import { IsEnum } from 'class-validator';
import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
import { CommentTag } from '../commentable.enum';

export class InputUpdateCommentDto {
  @IsEnum(CommentTag)
  tag: CommentTag;
}

export class UpdateCommentDto {
  @IsEnum(CommentTag)
  tag: CommentTag;
}
export class UpdateCommentResponseDto extends BaseRespondDto {
  data: UpdateCommentDto;
}
