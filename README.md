# cheese-backend

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

## Description

[Cheese Backend](https://github.com/SageSeekerSociety/cheese-backend)
The backend of the cheese Q&A system.

## Installation

Before installing this backend, please make sure that you have installed the pnpm package manager. If you haven't installed it, you can install it with the following command:

```bash
corepack enable pnpm
```

After this repo is cloned, you should install the dependencies with the following command:

```bash
pnpm install
```

You need to create a database for this backend. We recommend you to use PostgreSQL, because we have tested the app with PostgreSQL, and it works very well.

If you want to use other database, you need to modify src/app.prisma. Replace

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

Also, you need to setup an elasticsearch instance. It is used to provide full-text search feature.

Create `.env` file in the root directory of the repo, and write your configuration based on the following template:

```Dotenv
# The port that the app will listen to
PORT=3000

# The secret used to sign the JWT token
# You MUST change this secret to your own secret!
# Otherwise, your app will be as insecure as with an empty admin password!
JWT_SECRET="test-secret"

# The connection URL of the database for Prisma
# See https://www.prisma.io/docs/orm/reference/connection-urls for more information
# Keep align with the TypeORM configuration
PRISMA_DATABASE_URL="postgresql://${TYPEORM_DB_USERNAME}:${TYPEORM_DB_PASSWORD}@localhost:${TYPEORM_DB_PORT}/${TYPEORM_DB_NAME}?schema=public"

# TypeORM configuration for the database
# In our legacy code, we use TypeORM to connect to the database
# We plan to remove TypeORM in the future, but you still need to provide the configuration now.
TYPEORM_DB_TYPE=postgres
TYPEORM_DB_HOST=localhost
TYPEORM_DB_PORT=5432
TYPEORM_DB_USERNAME=username
TYPEORM_DB_PASSWORD=mypassword
TYPEORM_DB_NAME=mydb
TYPEORM_DB_SYNCHRONIZE=true # This option is used to synchronize the database schema with the entities
                            # Set it to false in production.
TYPEORM_DB_AUTO_LOAD_ENTITIES=true
TYPEORM_DB_CONNECT_TIMEOUT=60000
TYPEORM_DB_LOGGING=false

# The configuration for Elasticsearch
ELASTICSEARCH_NODE=http://127.0.0.1:9200/
ELASTICSEARCH_MAX_RETRIES=10
ELASTICSEARCH_REQUEST_TIMEOUT=60000
ELASTICSEARCH_PING_TIMEOUT=60000
ELASTICSEARCH_SNIFF_ON_START=true
ELASTICSEARCH_AUTH_USERNAME=elastic
ELASTICSEARCH_AUTH_PASSWORD=your-elasticsearch-password

# additionally setup the following if you want to use docker-compose
# to setup environment
MYSQL_DATABASE=${DB_NAME}
MYSQL_ROOT_PASSWORD=root_password_for_db
MYSQL_USER=${DB_USERNAME}
MYSQL_PASSWORD=${DB_PASSWORD}
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

If you add of modify .prisma files, you need to recompile the prisma client with the following command:

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

We recommend you to use VSCode to develop this app. We strongly recommend you to install the following extensions as a bisic development environment:

[Prisma Import](https://marketplace.visualstudio.com/items?itemName=ajmnz.prisma-import) to help you view and edit the Prisma schema file. Do not use the official Prisma extension, because it does not support the prisma-import syntax, which is used in our project.

In addition, you can install the following extensions for better development experience. However, they are not necessary, and you can choose alternatives if you like.

[Git Extension Pack](https://marketplace.visualstudio.com/items?itemName=donjayamanne.git-extension-pack) to help you manage the git repository.

[JavaScript and TypeScript Nightly](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-next&ssr=false#qna) for better TypeScript language support.

[vscode-openapi-viewer](https://marketplace.visualstudio.com/items?itemName=AndrewButson.vscode-openapi-viewer) to help you view the OpenAPI document.
