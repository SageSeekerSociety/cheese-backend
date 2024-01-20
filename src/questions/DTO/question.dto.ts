import { IsBoolean, IsInt, IsString } from "class-validator";
import { GroupDto } from "../../groups/DTO/group.dto";
import { UserDto } from "../../users/DTO/user.dto";

export class QuestionDto {
  @IsInt()
  readonly id: number;

  @IsString()
  readonly title: string;

  @IsString()
  readonly content: string;

  readonly author: UserDto;

  @IsInt()
  readonly type: number;

  @IsInt()
  readonly created_at: number;

  // todo: topics
  // @IsArray()
  // @ValidateNested({ each: true })
  // @Type(() => Topic)
  // readonly topics: Topic[];

  @IsInt()
  readonly updated_at: number;

  @IsBoolean()
  readonly is_follow: boolean;

  @IsBoolean()
  readonly is_like: boolean;

  @IsInt()
  readonly answer_count: number;

  @IsInt()
  readonly comment_count: number;

  @IsInt()
  readonly follow_count: number;

  @IsInt()
  readonly like_count: number;

  @IsInt()
  readonly view_count: number;

  @IsBoolean()
  readonly is_group: boolean;

  readonly group?: GroupDto;
}