# Development Guide

## Extracting Data from Requests

When extracting data from requests, there are two common approaches: using NestJS built-in pipes or using Data Transfer Objects (DTOs) with `class-validator` and `class-transformer`.

They have some nuances, like the former always transforming the data to the desired type, while the latter allows you to validate the data and transform it if necessary (See example below).

We recommend using pipes only for receiving id parameters, like `@Param('id', ParseIntPipe) id: number`, where `number` metadata allows `ValidationPipe` with `transform: true`, which is enabled globally, to transform the string to a number, and the `ParseIntPipe` is only used to ensure `id` is not `undefined`. In other cases, we recommend using DTOs with `class-validator` and `class-transformer`, which is more flexible and can be used in complex scenarios.

### Using DTOs

For example, when handling a POST request to create a question, we use a DTO like this:

```typescript
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  bounty: number = 0;
}
```

This DTO ensures that the title and content are strings and not empty. The bounty is an optional integer, and if it is not provided, it defaults to 0.

However, you should be careful when using these convenient decorators. The libraries `class-validator` and `class-transformer` have long been [poorly maintained](https://github.com/typestack/class-validator/issues/1775), and there are some caveats when using them.

In the example above, `@Type(() => Number)` is necessary to transform the string to a number, especially when the data is coming from `Query` or `Param`, where the data is always a string. Without it, the string will be mistakenly passed to the controller method.
