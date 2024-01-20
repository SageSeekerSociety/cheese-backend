import { IsString } from "class-validator";

export class QuestionDto {
  @IsString()
  readonly id: string;

  @IsString()
  readonly content: string;

  @IsString()
  readonly group_id: string;

  @IsString()
  readonly user_id: string;

  @IsString()
  readonly user_name: string;

  @IsString()
  readonly user_avatar: string;

  @IsString()
  readonly created_at: string;

  @IsString()
  readonly updated_at: string;

  @IsString()
  readonly deleted_at: string;
}