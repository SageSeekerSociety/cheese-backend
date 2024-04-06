import { IsInt, IsString } from 'class-validator';

export class UpdateGroupDto {
  @IsString()
  readonly name: string;

  @IsString()
  readonly intro: string;

  @IsInt()
  readonly avatarId: number;

  // todo: add cover
}
