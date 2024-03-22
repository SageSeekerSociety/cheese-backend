import { BaseError } from '../common/error/base-error';

export class InvalidMaterialTypeError extends BaseError {
  constructor() {
    super('InvalidMaterialTypeError', 'Invalid material type', 400);
  }
}

export class MaterialNotFoundError extends BaseError {
  constructor(materialId: number) {
    super('MaterialNotFoundError', `Material ${materialId} Not Found`, 404);
  }
}
export class MetaDataParseError extends BaseError {
  constructor(metaType: string) {
    super('MetaDataParseError', ` ${metaType} meta parse fail`, 400);
  }
}
export class MimeTypeNotMatchError extends BaseError {
  constructor(
    public readonly mimetype: string,
    public readonly materialtype: string,
  ) {
    super('MimeTypeNotMatchError', `${mimetype} is not ${materialtype}`, 422);
  }
}
