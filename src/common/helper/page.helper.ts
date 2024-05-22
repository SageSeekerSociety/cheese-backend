/*
 *  Description: This file implements the PageHelper class.
 *               It's a utility class for generating the PageResponseDto data.
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { PageDto } from '../DTO/page-response.dto';

export class PageHelper {
  /**
   * Used to paginate data from the starting position.
   * Typically used for the initial query to paginate data.
   *
   * Equivalent SQL:
   * SELECT ... FROM ...
   * WHERE ...
   * AND id >= (firstId)
   * LIMIT (pageSize + 1)
   * ORDER BY id ASC
   *
   * @param data Array of data items
   * @param pageSize Number of items per page
   * @param idGetter Function to get the ID of a data item
   * @returns A tuple containing the paginated data array and pagination information
   */
  static PageStart<TData>(
    data: TData[],
    pageSize: number,
    idGetter: (item: TData) => number,
  ): [TData[], PageDto] {
    return PageHelper.PageInternal(data, pageSize, false, 0, idGetter);
  }

  /**
   * Used to paginate data from a middle position.
   * Handles both previous and current page data.
   *
   * Equivalent SQL for fetching the previous page:
   * SELECT ... FROM ...
   * WHERE ...
   * AND id < (firstId)
   * LIMIT (pageSize)
   * ORDER BY id DESC
   *
   * Equivalent SQL for fetching the current page:
   * SELECT ... FROM ...
   * WHERE ...
   * AND id >= (firstId)
   * LIMIT (pageSize + 1)
   * ORDER BY id ASC
   *
   * @param prev Array of data items from the previous page
   * @param data Array of data items from the current page
   * @param pageSize Number of items per page
   * @param idGetterPrev Function to get the ID of a data item from the previous page
   * @param idGetter Function to get the ID of a data item from the current page
   * @returns A tuple containing the paginated data array and pagination information
   */
  static PageMiddle<TPrev, TData>(
    prev: TPrev[],
    data: TData[],
    pageSize: number,
    idGetterPrev: (item: TPrev) => number,
    idGetter: (item: TData) => number,
  ): [TData[], PageDto] {
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

  /**
   * Used to paginate data from a complete dataset.
   * This method should be used only when the entire dataset is loaded into memory.
   * Determines the starting point for pagination based on the provided pageStart parameter.
   *
   * This method handles two scenarios:
   * 1. When pageStart is undefined, it starts pagination from the beginning of the dataset.
   * 2. When pageStart is defined, it starts pagination from the specified ID.
   *
   * @param allData Array of all data items
   * @param pageStart The ID where pagination starts
   * @param pageSize Number of items per page
   * @param idGetter Function to get the ID of a data item
   * @param errorIfNotFound Optional error handler function, called if pageStart is not found in allData
   * @returns A tuple containing the paginated data array and pagination information
   */
  static PageFromAll<TData>(
    allData: TData[],
    pageStart: number | undefined,
    pageSize: number,
    idGetter: (item: TData) => number,
    // nullable
    // Something like '() => { throw new TopicNotFoundError(pageStart); }'
    // If pageStart is not found in allData, this function will be called.
    errorIfNotFound?: (pageStart: number) => void,
  ): [TData[], PageDto] {
    if (pageStart == undefined) {
      const data = allData.slice(0, pageSize + 1);
      return PageHelper.PageStart(data, pageSize, idGetter);
    } else {
      const pageStartIndex = allData.findIndex((r) => idGetter(r) == pageStart);
      if (pageStartIndex == -1) {
        /* istanbul ignore if  */
        if (errorIfNotFound == undefined)
          return this.PageStart([], pageSize, idGetter);
        else errorIfNotFound(pageStart);
      }
      const prev = allData.slice(0, pageStartIndex).slice(-pageSize).reverse();
      const data = allData.slice(pageStartIndex, pageStartIndex + pageSize + 1);
      return PageHelper.PageMiddle(prev, data, pageSize, idGetter, idGetter);
    }
  }

  /**
   * Internal method used to handle the core pagination logic.
   *
   * @param data Array of data items
   * @param pageSize Number of items per page
   * @param hasPrev Whether there is a previous page
   * @param prevStart The starting ID of the previous page
   * @param idGetter Function to get the ID of a data item
   * @returns A tuple containing the paginated data array and pagination information
   */
  private static PageInternal<TData>(
    data: TData[],
    pageSize: number,
    hasPrev: boolean,
    prevStart: number,
    idGetter: (item: TData) => number,
  ): [TData[], PageDto] {
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
