import { IsInt, IsString } from 'class-validator';

export class BaseRespondDto {
  constructor(code: number, message: string) {
    this.code = code;
    this.message = message;
  }

  @IsInt()
  code: number;

  @IsString()
  message: string;
}
