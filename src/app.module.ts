import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { MaterialsModule } from './materials/materials.module';
import { ServeStaticModule } from '@nestjs/serve-static';
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
    MaterialsModule,
    ServeStaticModule.forRoot({
      rootPath: process.env.FILE_UPLOAD_PATH,
      serveRoot: '/static',
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
