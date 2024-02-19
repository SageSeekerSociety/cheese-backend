# cheese-backend

芝士后端

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

## Description

[Cheese Backend](https://github.com/SageSeekerSociety/cheese-backend)
The backend of the cheese Q&A system.

## Installation

Before installing this backend, please make sure that you have installed the pnpm package
manager. If you haven't installed it, you can install it with the following command:

```bash
$ npm install -g pnpm
```

After this repo is cloned, you should install the dependencies with the following command:

```bash
$ pnpm install
```

You need to create a database for this backend. We recommend you to use PostgreSQL,
because we have tested the app with PostgreSQL, and it works very well.

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

Create `.env` file in the root directory of the repo, and write your configuration based
on the following template:

```Dotenv
# The port that the app will listen to
PORT=3000

# The secret used to sign the JWT token
# You MUST change this secret to your own secret!
# Otherwise, your app will be as insecure as with an empty admin password!
JWT_SECRET="test-secret"

# The connection URL of the database for Prisma
# See https://www.prisma.io/docs/orm/reference/connection-urls for more information
PRISMA_DATABASE_URL="postgresql://username:mypassword@localhost:5432/mydb?schema=sample"

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
```

## Running the app

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Build

Nest.js is a framework that can be run directly without building, but you can still build the app with the following command:

```bash
$ pnpm build
```

If you add of modify .prisma files, you need to recompile the prisma client with the following command:

```bash
$ pnpm build-prisma
```

## Test

We mainly use e2e tests to test the app, because the app is mainly responsible for CRUD operations, and the e2e tests can test the app more comprehensively.

```bash
# run all tests
$ pnpm run test

# run all tests with coverage report
$ pnpm run test:cov
```
With the commands above, all tests, including e2e tests and unit tests, will be run.
