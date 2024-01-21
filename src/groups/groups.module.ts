import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { GroupProfile } from './group-profile.entity';
import { Group, GroupMembership, GroupQuestionRelationship, GroupTarget } from './group.entity';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [TypeOrmModule.forFeature([
    Group,
    GroupProfile,
    GroupMembership,
    GroupQuestionRelationship,
    GroupTarget,
  ]), AuthModule],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule { }
