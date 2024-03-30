import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnswerModule } from './answer/answer.module';
import { AvatarsModule } from './avatars/avatars.module';
import { CommentsModule } from './comments/comment.module';
import configuration, {
  databaseConfigFactory,
} from './common/config/configuration';
import { GroupsModule } from './groups/groups.module';
import { QuestionsModule } from './questions/questions.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration] }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: databaseConfigFactory,
      inject: [ConfigService],
    }),
    UsersModule,
    QuestionsModule,
    AnswerModule,
    GroupsModule,
    AvatarsModule,
    CommentsModule,
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
