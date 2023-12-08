/*
 *  Description: This file defines the base respond DTO.
 *               All the respond DTOs should extend this class.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

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
