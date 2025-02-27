import { ParseSortPatternPipe } from './parse-sort-pattern.pipe';

describe('ParseSortPatternPipePipe', () => {
  it('should be defined', () => {
    expect(new ParseSortPatternPipe()).toBeDefined();
  });
  it('should parse pattern correctly', () => {
    const pipe = new ParseSortPatternPipe();
    expect(pipe.transform('field1,-field2')).toEqual({
      field1: 'asc',
      field2: 'desc',
    });
    expect(pipe.transform('+field1,-field2')).toEqual({
      field1: 'asc',
      field2: 'desc',
    });
    expect(pipe.transform('-field.subfield')).toEqual({
      field: { subfield: 'desc' },
    });
  });
  it('should throw an error when trying to sort by not allowed field', () => {
    const pipe = new ParseSortPatternPipe({ allowedFields: ['field1'] });
    expect(() => pipe.transform('field1,-field2')).toThrow(
      "Field 'field2' is not allowed to be sorted.",
    );
  });
});
