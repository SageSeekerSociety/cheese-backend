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

export class MetaIdNotFoundError extends BaseError {
  constructor(metaType: string) {
    super('MetaIdNotFoundError', `${metaType} meta Not Found`, 404);
  }
}

export class MetaNotFoundError extends BaseError {
  constructor(metaType: string, materialId: number) {
    super('MetaNotFoundError', `${metaType} meta ${materialId} Not Found`, 404);
  }
}
