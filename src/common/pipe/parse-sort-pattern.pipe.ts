import {
  ArgumentMetadata,
  HttpStatus,
  Injectable,
  Optional,
  PipeTransform,
} from '@nestjs/common';
import {
  ErrorHttpStatusCode,
  HttpErrorByCode,
} from '@nestjs/common/utils/http-error-by-code.util';

export type SortOrder = 'asc' | 'desc';

export type SortPattern = { [key: string]: SortOrder | SortPattern };

export interface ParseSortPatternPipeOptions {
  errorHttpStatusCode?: ErrorHttpStatusCode;
  exceptionFactory?: (error: string) => any;
  optional?: boolean;
  allowedFields?: string[];
}

/**
 * Parse sort pattern pipe
 * Example1: ?sort=field1,-field2 => { field1: 'asc', field2: 'desc' }
 * Example2: ?sort=+field1,-field2 => { field1: 'asc', field2: 'desc' }
 * Example3: ?sort=-field.subfield => { 'field': { 'subfield': 'desc' } }
 */
@Injectable()
export class ParseSortPatternPipe
  implements PipeTransform<string, SortPattern>
{
  private readonly exceptionFactory: (error: string) => any;

  private static isNil(val: any): val is null | undefined {
    return val === null || val === undefined;
  }

  constructor(
    @Optional() private readonly options?: ParseSortPatternPipeOptions,
  ) {
    this.options = this.options || {};
    const { errorHttpStatusCode = HttpStatus.BAD_REQUEST, exceptionFactory } =
      this.options;
    this.exceptionFactory =
      exceptionFactory ||
      ((error) => new HttpErrorByCode[errorHttpStatusCode](error));
  }

  private static getSortPattern(
    fields: string[],
    order: SortOrder,
  ): SortPattern | SortOrder {
    if (fields.length === 0) {
      return order;
    }
    const pattern = ParseSortPatternPipe.getSortPattern(fields.slice(1), order);
    const result: SortPattern = {};
    result[fields[0]] = pattern;
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform(value: string, _metadata?: ArgumentMetadata): SortPattern {
    if (ParseSortPatternPipe.isNil(value) && this.options?.optional) {
      return value;
    }
    try {
      return this.parseSortPattern(value);
    } catch (error) {
      throw this.exceptionFactory(`Invalid sort pattern: ${error}`);
    }
  }

  isAllowedField(field: string): boolean {
    return (
      !this.options?.allowedFields || this.options.allowedFields.includes(field)
    );
  }

  parseSortPattern(value: string): SortPattern {
    const sortPattern: SortPattern = {};
    if (value) {
      const items = value.split(',');
      for (const item of items) {
        const order = item.startsWith('-') ? 'desc' : 'asc';
        const field = item.replace(/^[+-]/, '');
        if (!this.isAllowedField(field)) {
          throw `Field '${field}' is not allowed to be sorted.`;
        }
        const fields = field.split('.');
        const pattern = ParseSortPatternPipe.getSortPattern(fields, order);
        Object.assign(sortPattern, pattern);
      }
    }
    return sortPattern;
  }
}
