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

You need to create a database for this backend. We require that you must use MySQL,
version >= 5.7.6, since we have used the fulltext index feature, which is added in
MySQL 5.6, and the in-built Chinese word segmentation feature, which is added in
MySQL 5.7.6. However, we recommend that you use MySQL 8.0, since we have tested
the app with MySQL 8.0, and it works very well.

Create a .secret directory in the repo directory, and create the following files:

### .secret/database.config.ts

```typescript
export const DB_TYPE = 'mysql';
export const DB_HOST = 'Your database host';
export const DB_PORT = 3306; // Your database port
export const DB_USERNAME = 'Your database username';
export const DB_PASSWORD = 'Your database password';
export const DB_DATABASE = 'Your database name';
```

### .secret/jwt.config.ts

```typescript
// You MUST change this secret to your own secret!
// Otherwise, your app will be as insecure as with an empty admin password!
export const JWT_SECRET = 'Your JWT secret';
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

## Test

We mainly use e2e tests to test the app, because the app is mainly responsible for CRUD operations, and the e2e tests can test the app more comprehensively.

```bash
# e2e tests
$ pnpm run test:e2e

# e2e tests with coverage report
$ pnpm run test:e2e:cov
```
However, we alse support unit tests, you can run the following command to run unit tests:
```bash
$ pnpm run test
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
