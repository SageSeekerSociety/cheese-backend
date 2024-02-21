/*
 *  Description: This file defines the DTO for paged respond.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { IsNumber } from 'class-validator';

export class PageRespondDto {
  @IsNumber()
  page_start: number;

  @IsNumber()
  page_size: number;

  @IsNumber()
  has_prev: boolean;

  @IsNumber()
  prev_start?: number;

  @IsNumber()
  has_more: boolean;

  @IsNumber()
  next_start?: number;
}
