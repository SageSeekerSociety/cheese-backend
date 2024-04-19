import { Module } from '@nestjs/common';
import { MaterialbundlesService } from './materialbundles.service';
import { MaterialbundlesController } from './materialbundles.controller';
import { MaterialsModule } from '../materials/materials.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MaterialsModule, PrismaModule, UsersModule, AuthModule],
  controllers: [MaterialbundlesController],
  providers: [MaterialbundlesService],
})
export class MaterialbundlesModule {}
