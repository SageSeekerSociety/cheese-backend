import { NestFactory } from '@nestjs/core';
import { RedisStore } from 'connect-redis';
import session from 'express-session';
import Redis from 'ioredis';
import { AppModule } from './app.module';
import { XForwardedForMiddleware } from './common/config/x-forwarded-for.middleware';
export const IS_DEV = process.env.NODE_ENV !== 'production';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOptions = {
    origin:
      process.env.CORS_ORIGINS?.split(',') ??
      (IS_DEV ? ['http://localhost:3000'] : []),
    methods: process.env.CORS_METHODS ?? 'GET,POST,PUT,PATCH,DELETE',
    allowedHeaders: process.env.CORS_HEADERS ?? 'Content-Type,Authorization',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  };
  app.enableCors(corsOptions);

  const redis = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
    username: process.env.REDIS_USERNAME ?? undefined,
    password: process.env.REDIS_PASSWORD ?? undefined,
  });

  await redis.ping();

  let redisStore = new RedisStore({
    client: redis,
    prefix: 'cheese-session:',
  });

  app.use(
    session({
      store: redisStore,
      secret: process.env.SESSION_SECRET ?? 'secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'strict',
      },
    }),
  );

  if (process.env.TRUST_X_FORWARDED_FOR === 'true')
    app.use(new XForwardedForMiddleware().use);

  if (!process.env.PORT)
    throw new Error('PORT environment variable is not defined');

  await app.listen(process.env.PORT);
}
bootstrap();
