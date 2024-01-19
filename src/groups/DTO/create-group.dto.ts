import { IsInt, IsString } from 'class-validator';

export class CreateGroupDto {
  @IsInt()
  id: number;

  @IsString()
  readonly name: string;

  @IsString()
  readonly intro: string;

  @IsString()
  readonly avatar: string;
}
