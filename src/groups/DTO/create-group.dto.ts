import { IsInt, IsString } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  readonly name: string;

  @IsString()
  readonly intro: string;

  @IsInt()
  readonly avatar: number;
}
