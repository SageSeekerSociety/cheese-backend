import { BaseError } from '../common/error/base-error';

export class BundleNotFoundError extends BaseError {
  constructor(bundleId: number) {
    super('BundleNotFoundError', `Bundle ${bundleId} Not Found`, 404);
  }
}

export class UpdateBundleDeniedError extends BaseError {
  constructor(bundleId: number) {
    super('UpdateBundleDeniedError', `Can Not Update Bundle ${bundleId}`, 403);
  }
}

export class DeleteBundleDeniedError extends BaseError {
  constructor(bundleId: number) {
    super('DeleteBundleDeniedError', `Can Not Delete Bundle ${bundleId}`, 403);
  }
}

export class QueryKeywordError extends BaseError {
  constructor(operator: string) {
    super('QueryKeywordError', `Unknown operator: ${operator}`, 400);
  }
}
export class KeywordTooLongError extends BaseError {
  constructor() {
    super('KeywordTooLongError', 'Keyword length should not exceed 100', 400);
  }
}
