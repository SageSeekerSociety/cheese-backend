import { NestFactory } from '@nestjs/core';
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

  if (process.env.TRUST_X_FORWARDED_FOR === 'true')
    app.use(new XForwardedForMiddleware().use);

  if (!process.env.PORT)
    throw new Error('PORT environment variable is not defined');

  await app.listen(process.env.PORT);
}
bootstrap();
