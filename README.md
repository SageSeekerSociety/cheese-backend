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

Create `.env` file in the root directory of the repo, and write your configuration based on the following template:

```Dotenv
DB_TYPE=mysql

DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=mysql
DB_NAME=cheesedb
DB_SYNCHRONIZE=true
DB_AUTO_LOAD_ENTITIES=true
DB_CONNECT_TIMEOUT=60000

JWT_SECRET=JWT_SECRET # You MUST change this secret to your own secret!
# Otherwise, your app will be as insecure as with an empty admin password!
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
# run all tests
$ pnpm run test

# run all tests with coverage report
$ pnpm run test:cov
```
With the commands above, all tests, including e2e tests and unit tests, will be run.
## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
