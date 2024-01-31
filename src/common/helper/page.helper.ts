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
  //
  // SELECT ... FROM ...
  //   WHERE ...
  //   AND id >= (firstId)
  // LIMIT (pageSize + 1)
  // ORDER BY id ASC
  //
  // in SQL.
  static PageStart<TData>(
    data: TData[],
    pageSize: number,
    idGetter: (item: TData) => number,
  ): [TData[], PageRespondDto] {
    return PageHelper.PageInternal(data, pageSize, false, 0, idGetter);
  }

  // Used when you do both
  //
  // SELECT ... FROM ...
  //   WHERE ...
  //   AND id < (firstId)
  // LIMIT (pageSize)
  // ORDER BY id DESC
  //
  // and
  //
  // SELECT ... FROM ...
  //   WHERE ...
  //   AND id >= (firstId)
  // LIMIT (pageSize + 1)
  // ORDER BY id ASC
  //
  // in SQL.
  static PageMiddle<TPrev, TData>(
    prev: TPrev[],
    data: TData[],
    pageSize: number,
    idGetterPrev: (item: TPrev) => number,
    idGetter: (item: TData) => number,
  ): [TData[], PageRespondDto] {
    let has_prev = false;
    let prev_start = 0;
    if (prev.length > 0) {
      has_prev = true;
      // Since prev.length > 0, prev.at(-1) is not undefined.
      prev_start = idGetterPrev(prev.at(-1)!);
    }
    return PageHelper.PageInternal(
      data,
      pageSize,
      has_prev,
      prev_start,
      idGetter,
    );
  }

  // Used when you do
  //
  // SELECT ... FROM ...
  //   WHERE ...
  // LIMIT 1000
  // ORDER BY id ASC
  //
  // in SQL.
  static PageFromAll<TData>(
    allData: TData[],
    pageStart: number | undefined,
    pageSize: number,
    idGetter: (item: TData) => number,
    // nullable
    // Something like '() => { throw new TopicNotFoundError(pageStart); }'
    // If pageStart is not found in allData, this function will be called.
    errorIfNotFound?: (pageStart: number) => void,
  ): [TData[], PageRespondDto] {
    if (pageStart == undefined) {
      const data = allData.slice(0, pageSize + 1);
      return PageHelper.PageStart(data, pageSize, idGetter);
    } else {
      const pageStartIndex = allData.findIndex((r) => idGetter(r) == pageStart);
      if (pageStartIndex == -1) {
        /* istanbul ignore if  */
        // Above is a hint for istanbul to ignore this if-statement.
        if (errorIfNotFound == undefined)
          return this.PageStart([], pageSize, idGetter);
        else errorIfNotFound(pageStart);
      }
      const prev = allData.slice(0, pageStartIndex).slice(-pageSize).reverse();
      const data = allData.slice(pageStartIndex, pageStartIndex + pageSize + 1);
      return PageHelper.PageMiddle(prev, data, pageSize, idGetter, idGetter);
    }
  }

  private static PageInternal<TData>(
    data: TData[],
    pageSize: number,
    hasPrev: boolean,
    prevStart: number,
    idGetter: (item: TData) => number,
  ): [TData[], PageRespondDto] {
    if (data.length == 0 || pageSize < 0) {
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
          // Since data.length > pageSize >= 0, data.at(-1) is not undefined.
          next_start: idGetter(data.at(-1)!),
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
