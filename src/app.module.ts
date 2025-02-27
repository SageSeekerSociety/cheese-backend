import { RedisModule } from '@liaoliaots/nestjs-redis';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AnswerModule } from './answer/answer.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { AvatarsModule } from './avatars/avatars.module';
import { CommentsModule } from './comments/comment.module';
import configuration from './common/config/configuration';
import { BaseErrorExceptionFilter } from './common/error/error-filter';
import { EnsureGuardInterceptor } from './common/interceptor/ensure-guard.interceptor';
import { TokenValidateInterceptor } from './common/interceptor/token-validate.interceptor';
import { GroupsModule } from './groups/groups.module';
import { MaterialbundlesModule } from './materialbundles/materialbundles.module';
import { MaterialsModule } from './materials/materials.module';
import { QuestionsModule } from './questions/questions.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration] }),
    UsersModule,
    QuestionsModule,
    AnswerModule,
    GroupsModule,
    AvatarsModule,
    CommentsModule,
    MaterialsModule,
    ServeStaticModule.forRoot({
      rootPath: process.env.FILE_UPLOAD_PATH,
      serveRoot: '/static',
    }),
    AttachmentsModule,
    MaterialbundlesModule,
    RedisModule.forRoot({
      config: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
        username: process.env.REDIS_USERNAME ?? undefined,
        password: process.env.REDIS_PASSWORD ?? undefined,
      },
    }),
  ],
  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        transform: true,
        disableErrorMessages: false,
      }),
    },
    {
      provide: APP_FILTER,
      useClass: BaseErrorExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TokenValidateInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: EnsureGuardInterceptor,
    },
  ],
})
export class AppModule {}
