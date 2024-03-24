import { SnakeCaseToCamelCasePipe } from './snake-case-to-camel-case.pipe';

describe('SnakeCaseToCamelCasePipe', () => {
  it('should be defined', () => {
    expect(new SnakeCaseToCamelCasePipe()).toBeDefined();
  });
  it('should transform pattern correctly', () => {
    const pipe = new SnakeCaseToCamelCasePipe();
    expect(pipe.transform('snake_case')).toBe('snakeCase');
    expect(pipe.transform('snake_case_long')).toBe('snakeCaseLong');
    expect(pipe.transform('snake')).toBe('snake');
  });
  it('should treat empty carefully', () => {
    const pipe = new SnakeCaseToCamelCasePipe();
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
  it('should ignore prefix', () => {
    const pipe = new SnakeCaseToCamelCasePipe({
      prefixIgnorePattern: 'prefix_',
    });
    expect(pipe.transform('prefix_snake_case')).toBe('prefix_snakeCase');
    expect(pipe.transform('prefix_snake_case_long')).toBe(
      'prefix_snakeCaseLong',
    );
    expect(pipe.transform('prefix_snake')).toBe('prefix_snake');
  });
  it('should ignore complex prefix regex pattern', () => {
    const pipe = new SnakeCaseToCamelCasePipe({ prefixIgnorePattern: '[+-]' });
    expect(pipe.transform('+snake_case')).toBe('+snakeCase');
    expect(pipe.transform('-snake_case')).toBe('-snakeCase');
    expect(pipe.transform('+snake')).toBe('+snake');
    expect(pipe.transform('-snake')).toBe('-snake');
  });
  it('should ignore suffix', () => {
    const pipe = new SnakeCaseToCamelCasePipe({
      suffixIgnorePattern: '_suffix',
    });
    expect(pipe.transform('snake_case_suffix')).toBe('snakeCase_suffix');
    expect(pipe.transform('snake_case_long_suffix')).toBe(
      'snakeCaseLong_suffix',
    );
    expect(pipe.transform('snake_suffix')).toBe('snake_suffix');
  });
  it('should ignore complex suffix regex pattern', () => {
    const pipe = new SnakeCaseToCamelCasePipe({ suffixIgnorePattern: '[+-]' });
    expect(pipe.transform('snake_case+')).toBe('snakeCase+');
    expect(pipe.transform('snake_case-')).toBe('snakeCase-');
    expect(pipe.transform('snake+')).toBe('snake+');
    expect(pipe.transform('snake-')).toBe('snake-');
  });
});
