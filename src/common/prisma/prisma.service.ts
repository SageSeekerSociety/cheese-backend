/*
 *  Description: This file defines PrismaService, which extends PrismaClient.
 *               Extensions are added to PrismaService to support soft delete.
 *
 *
 *  Author(s):
 *      Nictheboy Li    <nictheboy@outlook.com>
 *
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { UseSoftDelete } from './soft-delete.decorator';

// Please register all models that support soft delete below.
// A model with soft delete must have a field named "deletedAt" of type "DateTime?" in the database.
@PrismaDecorator(UseSoftDelete('Answer'))
@PrismaDecorator(UseSoftDelete('Comment'))
@PrismaDecorator(UseSoftDelete('Group'))
@PrismaDecorator(UseSoftDelete('GroupProfile'))
@PrismaDecorator(UseSoftDelete('GroupMembership'))
@PrismaDecorator(UseSoftDelete('GroupQuestionRelationship'))
@PrismaDecorator(UseSoftDelete('Question'))
@PrismaDecorator(UseSoftDelete('QuestionTopicRelation'))
@PrismaDecorator(UseSoftDelete('QuestionFollowerRelation'))
@PrismaDecorator(UseSoftDelete('Topics'))
@PrismaDecorator(UseSoftDelete('User'))
@PrismaDecorator(UseSoftDelete('UserProfile'))
@PrismaDecorator(UseSoftDelete('UserFollowingRelationship'))
export class PrismaClientExtended extends PrismaClient {
  withoutExtensions() {
    return this;
  }
}

export function PrismaDecorator(
  prismaWrapper: (client: PrismaClientExtended) => PrismaClientExtended,
) {
  return (
    constructor: typeof PrismaClientExtended,
  ): typeof PrismaClientExtended => {
    const cls = class {
      constructor() {
        const innerClient = new constructor();
        const client = prismaWrapper(innerClient);
        (client as any).withoutExtensions = () =>
          innerClient.withoutExtensions();
        return client;
      }
    };
    return cls as typeof PrismaClientExtended;
  };
}

@Injectable()
export class PrismaService
  extends PrismaClientExtended
  implements OnModuleInit
{
  async onModuleInit() {
    await this.$connect();
  }
}
