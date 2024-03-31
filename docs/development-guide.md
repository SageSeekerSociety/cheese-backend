# Development Guide

## Writing Clean Code

Writing clean code is essential for maintainability and readability. It is important to follow the best practices and conventions of the language and framework you are using. Here are some general guidelines to follow:

- Use meaningful names for variables, functions, and classes. We recommend using camelCase for variables and functions and PascalCase for classes. Avoid using abbreviations and acronyms unless they are well-known.

- Keep functions and classes small and focused. A function should do one thing and do it well. If a function is too long or has too many responsibilities, consider breaking it down into smaller functions. Follow the SRP principle.

- Avoid over-abstraction or over-optimization. Do not add unnecessary complexity or features that are not needed. Keep the code simple and easy to understand. Follow the KISS and YAGNI principles.

- [Do not write comments](https://www.youtube.com/watch?v=Bf7vDBBOBUA), especially in Chinese. Instead, write self-explanatory code. Comments tend to become outdated and misleading over time. If you need to explain something, consider refactoring the code to make it more readable. Write comments only when necessary, such as explaining non-obvious performance optimizations, workarounds, corner cases, or references to math or algorithms.

## Using Typescript

Typescript is a superset of JavaScript and is very similar to JavaScript. But it is still important to understand the type system, which is the main feature of Typescript. In the perspective of programming language theory, type increases the expressiveness of the language, and Typescript is no exception. It is important to understand the type system to take full advantage of it.

Here are some basic rules to follow when using Typescript:

- Always use types, especially for annotating function arguments and return types. Understand TypeScript's type system is used to perform static type checking effectively at compile time, and it does not affect the runtime behavior of the code. If you really want to make sure the type is correct at runtime, you can use `is` type guards or `instanceof` operator.

- Respect null safety. Use `null` and `undefined` only when necessary. Use [optional chaining](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#optional-chaining) and [nullish coalescing operators](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#nullish-coalescing) to handle `null` and `undefined`. Unless you know what you are doing, avoid using `!` to assert non-null.

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
