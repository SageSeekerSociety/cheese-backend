import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnswerModule } from './answer/answer.module';
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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
