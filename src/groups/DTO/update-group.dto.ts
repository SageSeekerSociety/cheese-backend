// src/groups/DTO/create-group.dto.ts

export class UpdateGroupDto {
  @IsInt()
  id: number;

  @IsString()
  readonly name: string;

  @IsString()
  readonly intro: string;

  @IsString()
  readonly avatar: string;
}