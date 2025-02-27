import { SortOrder, SortPattern } from '../pipe/parse-sort-pattern.pipe';

function isSortOrder(sort: SortPattern | SortOrder): sort is SortOrder {
  return typeof sort === 'string';
}

export function getPrevWhereBySort<T extends { [key: string]: any }>(
  sort: SortPattern,
  cursor: { [key in keyof T]: any },
) {
  const prevWhere: any = {};
  for (const key in sort) {
    if (isSortOrder(sort[key])) {
      prevWhere[key] =
        sort[key] === 'asc' ? { lt: cursor[key] } : { gt: cursor[key] };
    } else {
      prevWhere[key] = getPrevWhereBySort(
        sort[key] as SortPattern,
        cursor[key],
      );
    }
  }
  return prevWhere;
}

export function getCurrWhereBySort<T extends { [key: string]: any }>(
  sort: SortPattern,
  cursor: { [key in keyof T]: any },
) {
  const currWhere: any = {};
  for (const key in sort) {
    if (isSortOrder(sort[key])) {
      currWhere[key] =
        sort[key] === 'asc' ? { gte: cursor[key] } : { lte: cursor[key] };
    } else {
      currWhere[key] = getCurrWhereBySort(
        sort[key] as SortPattern,
        cursor[key],
      );
    }
  }
  return currWhere;
}
