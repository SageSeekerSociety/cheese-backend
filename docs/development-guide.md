# Development Guide

## Workflow

The development workflow is based on the [Gitflow Workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow). The repository has two main branches: `main` and `dev`. The `main` branch is the production branch, and the `dev` branch is the development branch. All feature branches should be created from the `dev` branch and merged back into the `dev` branch.

There are several tools to ensure the quality of the codebase, such as linters, formatters, git hooks, and CI/CD pipelines. However, it is more important to truly get into the habit of these kinds of workflows and practices, as they are essential for a smooth development process:

1. **Create a issue**: Before starting any work, create an issue in the repository. This issue should describe the feature or bug you are working on and should be assigned to you.

2. **Create a branch**: Checkout a new branch from the `dev` branch with a descriptive name. For example, if you are working on a feature to add user authentication, you can name the branch `feat/user-auth`.

3. **Write code**: Write the code for the feature or bug fix. Follow the best practices and conventions of the language and framework you are using.

4. **Commit changes**: Commit your changes frequently with descriptive commit messages. Use the imperative mood under [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) format, and keep the message short and concise.

5. **Write tests**: Write tests for the code you have written. Make sure to cover all edge cases and scenarios. Make sure test coverage is high and all tests pass. You could also follow the TDD approach and write tests before writing the code.

6. **Create a pull request**: Once you have completed the work, create a pull request from your branch to the `dev` branch. The pull request should reference the issue you are working on and should include a detailed description of the changes.

7. **Review code**: Ask a colleague to review your code. Make sure the code follows the best practices and conventions of the language and framework you are using. Make sure the code is clean, readable, and maintainable.

8. **Merge `dev` into your branch**: After the review, merge the `dev` branch into your branch to resolve any conflicts. Be very careful, and make sure the code still works as expected.

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
