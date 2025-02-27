import { MaterialType } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { UserDto } from '../../users/DTO/user.dto';

export class MaterialTypeDto {
  @IsEnum(MaterialType)
  type: MaterialType;
}
export class materialDto {
  id: number;
  type: MaterialType;
  uploader: UserDto;
  created_at: number; // timestamp
  expires: number | undefined;
  download_count: number;
  url: string;
  meta: PrismaJson.metaType;
}
