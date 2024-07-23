import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AnswerModule } from './answer/answer.module';
import { AvatarsModule } from './avatars/avatars.module';
import { CommentsModule } from './comments/comment.module';
import configuration from './common/config/configuration';
import { GroupsModule } from './groups/groups.module';
import { MaterialsModule } from './materials/materials.module';
import { QuestionsModule } from './questions/questions.module';
import { UsersModule } from './users/users.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { MaterialbundlesModule } from './materialbundles/materialbundles.module';
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
  ],
})
export class AppModule {}
