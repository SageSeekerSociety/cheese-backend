# cheese-backend

![test](https://github.com/SageSeekerSociety/cheese-backend/actions/workflows/test.yml/badge.svg)
![test_docker](https://github.com/SageSeekerSociety/cheese-backend/actions/workflows/build-test-docker-dev.yml/badge.svg)
[![codecov](https://codecov.io/gh/SageSeekerSociety/cheese-backend/graph/badge.svg?token=ZWHHESBFJW)](https://codecov.io/gh/SageSeekerSociety/cheese-backend)

## Description

[Cheese Backend](https://github.com/SageSeekerSociety/cheese-backend)
The backend of the cheese Q&A system.

## Installation

Before installing this backend, ensure that you have installed the pnpm package manager. If you haven't installed it, you can install it with the following command:

```bash
corepack enable pnpm
```

After this repo is cloned, you should install the dependencies with the following command:

```bash
pnpm install
```

You need to create a database for this backend. We recommend you to use PostgreSQL because we have tested the app with PostgreSQL, and it works very well.

If you want to use other databases, you need to modify src/app.prisma. Replace

```prisma
provider = "postgresql"
```

with what you want to use, such as

```prisma
provider = "mysql"
```

and recompile the prisma client with the following command:

```bash
pnpm build-prisma
```

Also, you need to set up an elasticsearch instance. It is used to provide full-text search feature.

Copy `sample.env` to `.env` and modify according to your condition.

```bash
cp sample.env .env
```

## Running the app

For development, you can run the app with the following command:

```bash
pnpm run start
```

With watch mode, the app will be recompiled automatically when you modify the source code.

```bash
pnpm run start:dev
```

For production, you can run the app with the following command:

```bash
pnpm run start:prod
```

## Build

Nest.js is a framework that can be run directly without building, but you can still build the app with the following command:

```bash
pnpm build
```

If you add to or modify .prisma files, you need to recompile the prisma client with the following command:

```bash
pnpm build-prisma
```

## Test

We mainly use e2e tests to test the app, because the app is mainly responsible for CRUD operations, and the e2e tests can test the app more comprehensively.

```bash
# run all tests
pnpm run test

# run all tests with coverage report
pnpm run test:cov
```

With the commands above, all tests, including e2e tests and unit tests, will be run.

## VSCode Environment

We recommend you to use VSCode to develop this app. We strongly recommend you to install the following extensions as a basic development environment:

[Prisma Import](https://marketplace.visualstudio.com/items?itemName=ajmnz.prisma-import) to help you view and edit the Prisma schema file. Do not use the official Prisma extension, because it does not support the prisma-import syntax, which is used in our project.

In addition, you can install the following extensions for better development experience. However, they are not necessary, and you can choose alternatives if you like.

[Git Extension Pack](https://marketplace.visualstudio.com/items?itemName=donjayamanne.git-extension-pack) to help you manage the git repository.

[JavaScript and TypeScript Nightly](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-next&ssr=false#qna) for better TypeScript language support.

[vscode-openapi-viewer](https://marketplace.visualstudio.com/items?itemName=AndrewButson.vscode-openapi-viewer) to help you view the OpenAPI document.
