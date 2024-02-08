import { IsString } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  readonly name: string;

  @IsString()
  readonly intro: string;

  @IsString()
  readonly avatar: string;
}
