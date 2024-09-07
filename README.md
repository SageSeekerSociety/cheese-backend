# cheese-backend

![test](https://github.com/SageSeekerSociety/cheese-backend/actions/workflows/test.yml/badge.svg)
![test_docker](https://github.com/SageSeekerSociety/cheese-backend/actions/workflows/build-test-docker-dev.yml/badge.svg)
[![codecov](https://codecov.io/gh/SageSeekerSociety/cheese-backend/graph/badge.svg?token=ZWHHESBFJW)](https://codecov.io/gh/SageSeekerSociety/cheese-backend)

## Description

[Cheese Backend](https://github.com/SageSeekerSociety/cheese-backend)
The backend of the cheese Q&A system.

## Run without installation

If you only want to start the application, you can use `docs/scripts/cheese-start.sh` and `docs/scripts/cheese-restart.sh`
to start and restart the application. You do not need to do anything else if you use these scripts. By default, after the application
is started in this way, it will be available at `http://localhost:3000`.

Notice that these scripts use the latest docker image on GitHub built from the `dev` branch, so it has nothing to do with your local code.
If you want to use your local code, you need to install the dependencies and run the app manually, as described below.

## Installation

Before installing this backend, ensure that you have installed the pnpm package manager. If you have not yet installed it, you can install it with the following command:

```bash
corepack enable pnpm
```

After this repo is cloned, you should install the dependencies with the following command:

```bash
pnpm install
```

You need to create a database for this backend. Currently, we only support PostgreSQL.
Also, you need to set up an Elasticsearch instance. It is used to provide full-text search feature.

Setting up PostgreSQL and Elasticsearch can be complicated, so we recommend you to use Docker to set up the environment.
You can use `docs/scripts/dependency-start.sh` and `docs/scripts/dependency-restart.sh` to start and restart the dependencies.
If you set up dependencies in this way, then simply use `docs/scripts/dependency.env` as your `.env` file.

```bash
docs/scripts/dependency-start.sh
cp docs/scripts/dependency.env .env
```

If you set up dependencies manually, you need to modify the `.env` file according to your condition.
Copy `sample.env` to `.env` and modify according to your condition.

```bash
cp sample.env .env
```

Once you believe you have set up the environment correctly, you can run the following command to initialize the database schema:
```bash
pnpm build-prisma
pnpm prisma db push
```

You need to start the app once before running tests.
```bash
pnpm start
```

Now, you can run tests with the following command to ensure that the app is working correctly:
```bash
pnpm test
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

If you add to or modify .prisma files, you need to recompile the Prisma client with the following command:

```bash
pnpm build-prisma
```

## Test

Our primary testing approach involves e2e tests, as the app focuses extensively on CRUD operations, and the e2e tests can test the app more comprehensively.

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

## Development

About the development of this app, you can refer to the [Development Guide](./docs/development-guide.md).
