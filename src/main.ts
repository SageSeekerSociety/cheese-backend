import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

export const IS_DEV = process.env.NODE_ENV !== 'production';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  if (IS_DEV) {
    app.enableCors({
      origin: ['http://localhost:3000'],
      methods: 'GET,POST,PUT,DELETE',
      allowedHeaders: 'Content-Type,Authorization',
      credentials: true,
    });
  }
  if (!process.env.PORT)
    throw new Error('PORT environment variable is not defined');
  await app.listen(process.env.PORT);
}
bootstrap();
