/*
 *  Description: This file implements the PageHelper class.
 *               Its an utility class for generating the PageRespondDto data.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { PageRespondDto } from '../DTO/page-respond.dto';

export class PageHelper {
  // Used when you do
  // 'SELECT ... WHERE id >= (firstId) LIMIT (pageSize + 1) ORDER BY id ASC'
  // in SQL.
  static PageStart<TData>(
    data: TData[],
    pageSize: number,
    idGetter: (item: TData) => number,
  ): [TData[], PageRespondDto] {
    return PageHelper.PageInternal(data, pageSize, false, 0, idGetter);
  }

  // Used when you do both
  // 'SELECT ... WHERE id < (firstId) LIMIT (pageSize) ORDER BY id DESC'
  // and
  // 'SELECT ... WHERE id >= (firstId) LIMIT (pageSize + 1) ORDER BY id ASC'
  // in SQL.
  static Page<TPrev, TData>(
    prev: TPrev[],
    data: TData[],
    pageSize: number,
    idGetterPrev: (item: TPrev) => number,
    idGetter: (item: TData) => number,
  ): [TData[], PageRespondDto] {
    var has_prev = false;
    var prev_start = 0;
    if (prev.length > 0) {
      has_prev = true;
      prev_start = idGetterPrev(prev.at(-1));
    }
    return PageHelper.PageInternal(
      data,
      pageSize,
      has_prev,
      prev_start,
      idGetter,
    );
  }

  private static PageInternal<TData>(
    data: TData[],
    pageSize: number,
    hasPrev: boolean,
    prevStart: number,
    idGetter: (item: TData) => number,
  ): [TData[], PageRespondDto] {
    if (data.length == 0) {
      return [
        [],
        {
          page_start: 0,
          page_size: 0,
          has_prev: hasPrev,
          prev_start: prevStart,
          has_more: false,
          next_start: 0,
        },
      ];
    } else if (data.length > pageSize) {
      return [
        data.slice(0, pageSize),
        {
          page_start: idGetter(data[0]),
          page_size: pageSize,
          has_prev: hasPrev,
          prev_start: prevStart,
          has_more: true,
          next_start: idGetter(data.at(-1)),
        },
      ];
    } else {
      return [
        data,
        {
          page_start: idGetter(data[0]),
          page_size: data.length,
          has_prev: hasPrev,
          prev_start: prevStart,
          has_more: false,
          next_start: 0,
        },
      ];
    }
  }
}
