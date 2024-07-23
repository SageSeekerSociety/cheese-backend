import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class updateMaterialBundleDto {
  @IsOptional()
  @IsString()
  title: string;
  @IsOptional()
  @IsString()
  content: string;
  @IsOptional()
  @IsArray()
  @IsNotEmpty()
  @IsInt({ each: true })
  materials: number[];
}
