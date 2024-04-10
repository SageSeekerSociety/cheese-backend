/*
 *  Description: This file defines the base respond DTO.
 *               All the respond DTOs should extend this class.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

export interface BaseResponseDto {
  code: number;
  message: string;
}
